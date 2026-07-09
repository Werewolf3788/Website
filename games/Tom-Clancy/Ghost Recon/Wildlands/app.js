/*
 * ==========================================
 * --- PROGRESSION PLATFORM CONTROLLER ---
 * Project: Ghost Recon Wildlands Squad Hub
 * Version: 3.4.1 - Main Profile Prioritization Engine
 * Version Timestamp: Thu, July 9, 2026, 12:08 PM Chicago Time
 * Compatibility: Firebase Web SDK v10.8.0 Compat Layer
 * Note: HARDCODED TO CHICAGO TIME (CT) PER SYSTEM COMPLIANCE DIRECTIVES.
 * ==========================================
 */

// 1. Core Firebase Web System Configuration with Your Live Credentials
const firebaseConfig = {
    apiKey: "AIzaSyA_O_Qm3bazJpi6wPqafsKLNNJdIUCvQGM",
    authDomain: "game-tracker-5b2ef.firebaseapp.com",
    databaseURL: "https://game-tracker-5b2ef-default-rtdb.firebaseio.com",
    projectId: "game-tracker-5b2ef",
    storageBucket: "game-tracker-5b2ef.firebasestorage.app",
    messagingSenderId: "555667047127",
    appId: "1:555667047127:web:fc70f96b04d0380a9aa692"
};

// Safe lifecycle initial execution check to prevent duplicate console initialization errors
if (!firebase.apps.length) { 
    firebase.initializeApp(firebaseConfig); 
}

const auth = firebase.auth();
const rtdb = firebase.database();  
const firestore = firebase.firestore(); 

// Global tracking references initialized on boot window
let currentActiveOperator = "werewolf"; // Default pointer set to werewolf on startup
let loggedInUserEmail = null;
let currentSkillCategory = "WEAPON"; // Default category selection mapping

const ADMIN_EMAIL = "raykevin71888@gmail.com";
const AUTH_PERMISSION_MAP = {
    "raykevin71888@gmail.com": "werewolf",
    "cartnalray9@gmail.com": "ray"
};

// MASTER POOL REFERENCE: Held in background memory, compiled into dropdown ONLY on live sign-in matching
const SQUAD_POOL_MAP = {
    "ray": "Ray (OneLIVIDMAN)",
    "darkwing": "TJ (Darkwing69420)",
    "marc": "Marc (DesdemonaTiger)"
};

// DOM Node Context Hooks
const signInBtn = document.getElementById("googleSignInBtn");
const signOutBtn = document.getElementById("signOutBtn");
const profileStatus = document.getElementById("userProfileStatus");
const userAvatar = document.getElementById("userAvatar");
const editTriggerZone = document.getElementById("editTriggerZone");
const userSelect = document.getElementById("userSelect");
const skillsGrid = document.getElementById("skillsTreeGrid");

// RECOMPILATION ENGINE: Renders only your werewolf information by default until someone else validates an account
function renderDropdownMenuByAccessState() {
    const selectedCacheKey = currentActiveOperator;
    userSelect.innerHTML = "";

    // Default Whitelist: Only your main active profile renders out on standard page loading
    const activeViewMap = {
        "werewolf": "Kevin (werewolf3788)"
    };

    // Dynamic Injection: If someone else logs in, drop their account option into the active layout list
    if (loggedInUserEmail && loggedInUserEmail !== ADMIN_EMAIL) {
        const structuralNodeId = AUTH_PERMISSION_MAP[loggedInUserEmail];
        if (structuralNodeId && SQUAD_POOL_MAP[structuralNodeId]) {
            activeViewMap[structuralNodeId] = SQUAD_POOL_MAP[structuralNodeId];
        }
    }

    // Master Admin Rule: If you are logged in, allow full monitoring select controls across all entities
    if (loggedInUserEmail === ADMIN_EMAIL) {
        Object.assign(activeViewMap, SQUAD_POOL_MAP);
    }

    // Append authorized option tags into the select element container
    for (const [id, label] of Object.entries(activeViewMap)) {
        const opt = document.createElement("option");
        opt.value = id;
        opt.innerText = label;
        if (id === selectedCacheKey) opt.selected = true;
        userSelect.appendChild(opt);
    }
}

auth.onAuthStateChanged(user => {
    if (user) {
        loggedInUserEmail = user.email;
        signInBtn.classList.add("hidden");
        profileStatus.classList.remove("hidden");
        userAvatar.src = user.photoURL || "";
        evaluateEditButtonPermission();
    } else {
        loggedInUserEmail = null;
        currentActiveOperator = "werewolf"; // Safely cycle selection context parameters back to base
        signInBtn.classList.remove("hidden");
        profileStatus.classList.add("hidden");
        editTriggerZone.classList.add("hidden");
        document.getElementById("editStatsPanel").classList.add("hidden");
    }
    // Re-build select node list layout arrays seamlessly based on authorization transitions
    renderDropdownMenuByAccessState();
    refreshActiveSkillTree();
    attachHybridDataStreams(currentActiveOperator);
});

function evaluateEditButtonPermission() {
    if (!loggedInUserEmail) { editTriggerZone.classList.add("hidden"); return; }
    if (loggedInUserEmail === ADMIN_EMAIL) { editTriggerZone.classList.remove("hidden"); return; }

    const permittedNode = AUTH_PERMISSION_MAP[loggedInUserEmail];
    if (permittedNode && permittedNode === currentActiveOperator) {
        editTriggerZone.classList.remove("hidden");
    } else {
        editTriggerZone.classList.add("hidden");
        document.getElementById("editStatsPanel").classList.add("hidden");
    }
}

userSelect.addEventListener("change", (e) => {
    currentActiveOperator = e.target.value;
    document.getElementById("editStatsPanel").classList.add("hidden");
    evaluateEditButtonPermission();
    attachHybridDataStreams(currentActiveOperator);
});

signInBtn.addEventListener("click", () => {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider).catch(err => console.error("Identity verification rejected:", err.message));
});

signOutBtn.addEventListener("click", () => { auth.signOut(); });

function attachHybridDataStreams(operatorKey) {
    console.log(`[PIPELINE] Initializing data streams for context target: ${operatorKey}`);
    
    rtdb.ref(`psn/users/${operatorKey}`).on("value", (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            document.getElementById("operatorName").innerText = data.onlineId || operatorKey;
            document.getElementById("tierLevel").innerText = data.level || "--";
            document.getElementById("playstyleType").innerText = data.currentGame || "--";
            document.getElementById("avgKillDist").innerText = data.region || "US";
            document.getElementById("statLifetime").innerText = data.gamesPlayed || "--";
            document.getElementById("longestShot").innerText = data.platform || "--";
            document.getElementById("favWeapon").innerText = data.currentGameActivity || "Dashboard";
            document.getElementById("favWeapon2").innerText = data.bio || "Official Profile Card";
        }
    });

    rtdb.ref(`skills`).on("value", (snapshot) => {
        const structuralTree = snapshot.exists() ? snapshot.val() : {};
        renderSkillsTreeInterface(structuralTree);
    });

    loadAutomatedGameCardsFromFirestore(operatorKey);
}

function renderSkillsTreeInterface(skillsData) {
    skillsGrid.innerHTML = "";
    const activeNodesArray = skillsData[currentSkillCategory] || [];
    
    if (!Array.isArray(activeNodesArray) || activeNodesArray.length === 0) {
        skillsGrid.innerHTML = `
            <div class="skill-card unlocked" style="opacity: 0.35; border-style: dashed; grid-column: 1 / -1; min-height: 120px; display: flex; align-items: center; justify-content: center; width: 100%;">
                <div style="color:#8a99ad; text-align:center; font-size:13px; font-weight:bold;">
                    No manual skill entries tracked under path 'skills/${currentSkillCategory}'. Mapped framework ready for synchronization updates.
                </div>
            </div>
        `;
        return;
    }

    activeNodesArray.forEach((skill, index) => {
        if (!skill) return;
        
        const card = document.createElement("div");
        const currentRank = parseInt(skill.current) || 0;
        const maxRank = parseInt(skill.max) || 4;
        const isMaxed = currentRank === maxRank;
        
        card.className = `skill-card unlocked ${isMaxed ? 'maxed' : ''}`;
        card.innerHTML = `
            <div class="card-top-action">
                <h4 style="color:#fff; font-size:14px; font-weight:bold;">${skill.name || 'Tactical Asset Node'}</h4>
                <span style="font-size:11px; color:#8a99ad; display:block; margin-top:2px;">Node ID: ${skill.id || 'unassigned_id'}</span>
                <div class="skill-meta-row" style="margin-top:8px;">
                    <div class="skill-rank-indicators">
                        ${Array.from({ length: maxRank }).map((_, rIdx) => `
                            <div class="rank-dot ${rIdx < currentRank ? 'active' : ''}"></div>
                        `).join('')}
                    </div>
                </div>
            </div>
            <div class="card-bottom-action">
                <button class="medal-toggle-btn ${skill.collected === true || skill.collected === "true" ? 'medal-earned' : ''}" 
                        style="cursor: ${loggedInUserEmail ? 'pointer' : 'not-allowed'}; opacity: ${loggedInUserEmail ? '1' : '0.55'};"
                        onclick="mutateDatabaseNodeRank('${currentSkillCategory}', '${index}', ${currentRank}, ${maxRank}, ${skill.collected === true})">
                    ⭐
                </button>
            </div>
        `;
        skillsGrid.appendChild(card);
    });
}

window.mutateDatabaseNodeRank = function(category, itemIndex, currentRank, maxRank, isCollected) {
    if (!loggedInUserEmail) return; 
    
    let nextRank = currentRank + 1;
    let nextCollectedState = isCollected;
    
    if (nextRank > maxRank) {
        nextRank = 0;
        nextCollectedState = !isCollected; 
    }

    const transactionPayload = {};
    transactionPayload[`skills/${category}/${itemIndex}/current`] = nextRank;
    transactionPayload[`skills/${category}/${itemIndex}/collected`] = nextCollectedState;

    rtdb.ref().update(transactionPayload)
        .then(() => console.log(`[RTDB UPDATE SUCCESS] Incremented skill node slot index position: ${itemIndex}`))
        .catch(err => console.error("[RTDB ABORTED] Update failed boundary evaluation rules: ", err.message));
};

window.switchSkillCategory = function(categoryName) {
    currentSkillCategory = categoryName;
    document.querySelectorAll(".tab-link").forEach(btn => {
        btn.classList.remove("active");
        if (btn.getAttribute("onclick").includes(categoryName)) btn.classList.add("active");
    });
    refreshActiveSkillTree();
};

function refreshActiveSkillTree() {
    rtdb.ref(`skills`).get().then(snapshot => {
        const structuralTree = snapshot.exists() ? snapshot.val() : {};
        renderSkillsTreeInterface(structuralTree);
    });
}

function loadAutomatedGameCardsFromFirestore(operatorKey) {
    const targetCatalog = document.getElementById("automatedFirestoreGamesCatalog");
    targetCatalog.innerHTML = `<div style="color:#8a99ad; padding:20px; text-align:center; width:100%;">Streaming Firestore subcollection fields...</div>`;

    firestore.collection(`artifacts/game-tracker-5b2ef/data/public/user/${operatorKey}/games`)
      .get()
      .then((querySnapshot) => {
          targetCatalog.innerHTML = "";
          if (querySnapshot.empty) {
              targetCatalog.innerHTML = `
                  <div class="skill-card unlocked" style="opacity: 0.35; border-style: dashed; grid-column: 1 / -1; min-height: 120px; display: flex; align-items: center; justify-content: center; width: 100%;">
                      <div style="color:#4a5568; text-align:center; font-size:13px; font-weight:bold;">No automated library records processed in Firestore for this user node. Framework active.</div>
                  </div>
              `;
              return;
          }

          querySnapshot.forEach((doc) => {
              const game = doc.data();
              const cardHTML = `
                  <div class="skill-card unlocked ${game.completionProgress === 100 ? 'maxed' : ''}">
                      <div class="card-top-action">
                          <h4 style="color:#fff; font-size:14px; margin-bottom:4px;">${game.gameName}</h4>
                          <span style="font-size:11px; color:#8a99ad; display:block; margin-bottom:8px;">ID: ${game.npCommunicationId}</span>
                          ${game.coverArt ? `<img src="${game.coverArt}" class="dir-thumb-img" style="width:100%; height:80px; margin-bottom:6px; object-fit:cover;" loading="lazy">` : ''}
                          <div class="progress-labels" style="margin-top:4px;">
                              <span style="font-size:11px; color:#8a99ad;">Progress</span>
                              <span style="font-size:11px; color:#fff; font-weight:bold;">${game.completionProgress}%</span>
                          </div>
                          <div class="bar-bg" style="height:6px;"><div class="bar-fill" style="width:${game.completionProgress}%; background-color:${game.completionProgress === 100 ? '#28a745' : '#0076a8'};"></div></div>
                      </div>
                      <div class="card-bottom-action">
                          <span class="trophy-checkbox-status">🏆 ${game.trophyRatio}</span>
                      </div>
                  </div>
              `;
              targetCatalog.innerHTML += cardHTML;
          });
      })
      .catch(err => console.error("[FIRESTORE ERROR] Reading dynamic catalog collection nodes:", err.message));
}

document.getElementById("toggleEditStats").addEventListener("click", () => {
    document.getElementById("editStatsPanel").classList.toggle("hidden");
});

document.getElementById("saveStatsBtn").addEventListener("click", function() {
    if (!currentActiveOperator || !loggedInUserEmail) return;

    const profileUpdates = {
        onlineId: document.getElementById("editPlaystyle").value || currentActiveOperator,
        level: parseInt(document.getElementById("editAvgDist").value) || 0,
        currentGame: document.getElementById("editTactical").value || "Dashboard",
        region: document.getElementById("editStealth").value || "US",
        gamesPlayed: parseInt(document.getElementById("editLifetime").value) || 0,
        platform: document.getElementById("editLongest").value || "PS5",
        currentGameActivity: document.getElementById("editPrecision").value || null,
        bio: document.getElementById("editFav1").value || "Official Profile Member Card",
        lastManualFormUpdate: new Date().toLocaleString()
    };

    rtdb.ref(`psn/users/${currentActiveOperator}`).update(profileUpdates)
      .then(() => {
          console.log(`[RTDB PROFILE MUTATION SUCCESS] Synchronized fields for ${currentActiveOperator}`);
          document.getElementById("editStatsPanel").classList.add("hidden");
      })
      .catch((error) => console.error("Database updates rejected context boundaries: ", error.message));
});

// STARTUP INITIALIZATION
renderDropdownMenuByAccessState();
attachHybridDataStreams(currentActiveOperator);
