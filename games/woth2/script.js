// Line 1: Way of the Hunter Master Portal Controller & Firebase Bridge
// [Smart Cache-Buster Time: 2026-10-07 12:19 EDT | Firebase Sync Target: /utm_links | Version: 1.0.0]

document.addEventListener("DOMContentLoaded", () => {
  // Line 5: Initialize Application Architecture
  const App = {
    firebaseConfig: {
      apiKey: "AIzaSyDummyKeyReplaceWithYourOwnAuthKey",
      authDomain: "entertainment-71888.firebaseapp.com",
      databaseURL: "https://entertainment-71888-default-rtdb.firebaseio.com",
      projectId: "entertainment-71888",
      storageBucket: "entertainment-71888.appspot.com",
      messagingSenderId: "1234567890",
      appId: "1:1234567890:web:abcdef123456"
    },

    // Line 17: Local Data Sources from GitHub Raw Mirror
    dataUrls: {
      lifecycles: "//raw.githubusercontent.com/Werewolf3788/Website/main/data/woth2_lifecycles.json",
      species: "//raw.githubusercontent.com/Werewolf3788/Website/main/data/woth2_species.json",
      needZones: "//raw.githubusercontent.com/Werewolf3788/Website/main/data/woth2_need_zones.json",
      reserves: "//raw.githubusercontent.com/Werewolf3788/Website/main/data/woth2_reserves.json"
    },

    currentUser: null,
    speciesData: [],
    rtdbLinks: {},

    init() {
      this.initFirebase();
      this.initAuthListeners();
      this.bindDOMEvents();
      this.fetchUTMLinks();
      this.loadGameData();
    },

    // Line 39: Initialize Firebase Safely with Fallback Null-Checking
    initFirebase() {
      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(this.firebaseConfig);
        }
        this.auth = firebase.auth();
        this.rtdb = firebase.database();
        this.firestore = firebase.firestore();

        // Phone Auth Recaptcha invisible verifier
        window.recaptchaVerifier = new firebase.auth.RecaptchaVerifier("recaptcha-container", {
          size: "invisible",
          callback: () => {}
        });
      } catch (err) {
        console.warn("Firebase initialization failed or offline mode triggered:", err);
        this.updateSyncStatus(false, "Storage: LocalStorage (Offline Mode)");
      }
    },

    // Line 59: Dynamic UTM Links Fetcher from RTDB with Write-Protection Gate
    fetchUTMLinks() {
      const statusPill = document.getElementById("firebaseStatusBadge");
      const localLinks = localStorage.getItem("woth_utm_links");

      if (!this.rtdb) {
        if (localLinks) this.renderNavigation(JSON.parse(localLinks));
        return;
      }

      const utmRef = this.rtdb.ref("/utm_links");
      utmRef.on("value", (snapshot) => {
        try {
          const val = snapshot.val();
          // Write-Protection Gate: verify snapshot exists & is non-empty
          if (val && Object.keys(val).length > 0) {
            this.rtdbLinks = val;
            localStorage.setItem("woth_utm_links", JSON.stringify(val));
            if (statusPill) {
              statusPill.textContent = "RTDB: Live Connected";
              statusPill.className = "status-pill status-connected";
            }
            this.renderNavigation(val);
          } else {
            console.warn("RTDB returned empty snapshot. Retaining local state.");
            if (localLinks) this.renderNavigation(JSON.parse(localLinks));
          }
        } catch (parseErr) {
          console.error("Failed processing snapshot payload:", parseErr);
          if (localLinks) this.renderNavigation(JSON.parse(localLinks));
        }
      }, (error) => {
        console.warn("RTDB Listener failure. Using local fallback.", error);
        if (statusPill) {
          statusPill.textContent = "RTDB: Offline Cache";
          statusPill.className = "status-pill status-connecting";
        }
        if (localLinks) this.renderNavigation(JSON.parse(localLinks));
      });
    },

    // Line 98: Render RTDB Navigation Bar (Folders for Groups, Standalone for non-grouped)
    renderNavigation(linksObj) {
      const navList = document.getElementById("navList");
      if (!navList || !linksObj) return;

      navList.innerHTML = "";
      const grouped = {};
      const standalone = [];

      // Categorize into groups or standalone buttons
      Object.entries(linksObj).forEach(([key, item]) => {
        if (item.group && item.group.trim() !== "") {
          const groupName = item.group.trim();
          if (!grouped[groupName]) grouped[groupName] = [];
          grouped[groupName].push({ key, ...item });
        } else {
          standalone.push({ key, ...item });
        }
      });

      // Render Dropdown Groups
      Object.entries(grouped).forEach(([groupName, items]) => {
        const li = document.createElement("li");
        li.className = "nav-item";

        const btn = document.createElement("button");
        btn.className = "dropdown-trigger";
        btn.textContent = `${groupName} ▾`;

        const menu = document.createElement("div");
        menu.className = "dropdown-menu";

        items.forEach(child => {
          const a = document.createElement("a");
          a.className = "dropdown-item";
          a.href = child.url || "#";
          
          // Internal links open in same tab; external links in new tab
          if (child.url && !child.url.includes(window.location.hostname)) {
            a.target = "_blank";
            a.rel = "noopener noreferrer";
          }

          if (child.image) {
            const img = document.createElement("img");
            img.src = child.image;
            img.className = "dropdown-item-img";
            img.alt = ""; // Alt text restricted per styling guideline
            a.appendChild(img);
          }

          const label = document.createElement("span");
          label.textContent = child.title || child.key;
          a.appendChild(label);
          menu.appendChild(a);
        });

        li.appendChild(btn);
        li.appendChild(menu);
        navList.appendChild(li);
      });

      // Render Standalone Nav Items
      standalone.forEach(item => {
        const li = document.createElement("li");
        li.className = "nav-item";

        const a = document.createElement("a");
        a.className = "nav-link";
        a.href = item.url || "#";
        a.textContent = item.title || item.key;

        if (item.url && !item.url.includes(window.location.hostname)) {
          a.target = "_blank";
          a.rel = "noopener noreferrer";
        }

        li.appendChild(a);
        navList.appendChild(li);
      });
    },

    // Line 178: Cross-Reference & Load Species / Lifecycle Data
    async loadGameData() {
      try {
        const res = await fetch(this.dataUrls.lifecycles);
        if (!res.ok) throw new Error("Network response was not ok");
        const json = await res.json();
        this.speciesData = json.species_lifecycles || [];
        this.renderSpeciesCards(this.speciesData);
      } catch (e) {
        console.warn("Unable to fetch remote lifecycle data. Attempting local storage cache...", e);
        const cached = localStorage.getItem("woth_lifecycles_cache");
        if (cached) {
          this.speciesData = JSON.parse(cached);
          this.renderSpeciesCards(this.speciesData);
        }
      }
    },

    // Line 196: Render Species Cards with Life Cycle Stages & Warnings
    renderSpeciesCards(items) {
      const container = document.getElementById("speciesCardsContainer");
      const countBadge = document.getElementById("recordCount");
      if (!container) return;

      container.innerHTML = "";
      if (countBadge) countBadge.textContent = `${items.length} Records`;

      items.forEach(sp => {
        const card = document.createElement("div");
        card.className = "species-card";

        const maxYears = sp.max_age_years || (sp.mature_years ? sp.mature_years[sp.mature_years.length - 1] : "N/A");
        const days = sp.total_lifespan_days || (maxYears !== "N/A" ? maxYears * 3 : "N/A");

        card.innerHTML = `
          <div class="species-title">${sp.species}</div>
          <div class="meta-row">
            <span>Lifespan: <strong>${maxYears} Yrs</strong> (${days} Days)</span>
            <span>Reserves: <strong>${sp.reserves ? sp.reserves.length : 1}</strong></span>
          </div>
          <div class="age-bracket-bar" title="Young / Adult / Mature Distribution">
            <div class="bar-young" style="flex: ${(sp.young_years || []).length}"></div>
            <div class="bar-adult" style="flex: ${(sp.adult_years || []).length}"></div>
            <div class="bar-mature" style="flex: ${(sp.mature_years || []).length}"></div>
          </div>
          <div class="advisory-box">
            <strong>Advisory:</strong> ${sp.cull_advisory || sp.mortality_warning || "No special warnings."}
          </div>
        `;
        container.appendChild(card);
      });
    },

    // Line 233: Authentication State Management
    initAuthListeners() {
      if (!this.auth) return;

      this.auth.onAuthStateChanged(user => {
        const authBtn = document.getElementById("authModalBtn");
        const profileBadge = document.getElementById("userProfile");
        const displayName = document.getElementById("userDisplayName");

        if (user) {
          this.currentUser = user;
          if (authBtn) authBtn.classList.add("hidden");
          if (profileBadge) profileBadge.classList.remove("hidden");
          if (displayName) displayName.textContent = user.displayName || user.email || user.phoneNumber || "Hunter";
          this.updateSyncStatus(true, `Synced: ${user.email || "Account Active"}`);
          this.syncUserData();
        } else {
          this.currentUser = null;
          if (authBtn) authBtn.classList.remove("hidden");
          if (profileBadge) profileBadge.classList.add("hidden");
          this.updateSyncStatus(false, "Storage: LocalStorage (Offline Mode)");
        }
      });
    },

    // Line 258: Cloud Firestore Progress Syncing
    async syncUserData() {
      if (!this.currentUser || !this.firestore) return;
      try {
        const userDocRef = this.firestore.collection("users").doc(this.currentUser.uid);
        const doc = await userDocRef.get();
        if (doc.exists) {
          console.log("Cloud record pulled successfully:", doc.data());
        } else {
          // If brand new user, push existing localStorage into cloud
          const existingHarvests = localStorage.getItem("woth_harvests") || "[]";
          await userDocRef.set({
            harvests: JSON.parse(existingHarvests),
            lastSync: firebase.firestore.FieldValue.serverTimestamp()
          });
        }
      } catch (err) {
        console.warn("Firestore syncing error:", err);
      }
    },

    // Line 278: Event Listeners for Filters, Modals, and Auth Forms
    bindDOMEvents() {
      // Mobile Navigation Drawer Toggle
      const menuBtn = document.getElementById("menuToggle");
      const nav = document.getElementById("dynamicNav");
      if (menuBtn && nav) {
        menuBtn.addEventListener("click", () => nav.classList.toggle("open"));
      }

      // Modal Controls
      const modal = document.getElementById("authModal");
      const openBtn = document.getElementById("authModalBtn");
      const closeBtn = document.getElementById("authModalClose");

      if (openBtn && modal) openBtn.addEventListener("click", () => modal.classList.remove("hidden"));
      if (closeBtn && modal) closeBtn.addEventListener("click", () => modal.classList.add("hidden"));

      // Google Sign-In
      const googleBtn = document.getElementById("googleSignInBtn");
      if (googleBtn) {
        googleBtn.addEventListener("click", () => {
          const provider = new firebase.auth.GoogleAuthProvider();
          this.auth.signInWithPopup(provider)
            .then(() => modal.classList.add("hidden"))
            .catch(err => alert("Google Auth Error: " + err.message));
        });
      }

      // Email & Password Auth
      const emailInBtn = document.getElementById("emailSignInBtn");
      const emailUpBtn = document.getElementById("emailSignUpBtn");
      const emailInput = document.getElementById("authEmail");
      const passInput = document.getElementById("authPassword");

      if (emailInBtn) {
        emailInBtn.addEventListener("click", () => {
          this.auth.signInWithEmailAndPassword(emailInput.value, passInput.value)
            .then(() => modal.classList.add("hidden"))
            .catch(err => alert("Login Error: " + err.message));
        });
      }

      if (emailUpBtn) {
        emailUpBtn.addEventListener("click", () => {
          this.auth.createUserWithEmailAndPassword(emailInput.value, passInput.value)
            .then(() => modal.classList.add("hidden"))
            .catch(err => alert("Sign Up Error: " + err.message));
        });
      }

      // Phone Verification Flow
      const sendCodeBtn = document.getElementById("sendPhoneCodeBtn");
      const verifyCodeBtn = document.getElementById("verifyPhoneCodeBtn");
      const phoneInput = document.getElementById("phoneNumber");
      const codeInput = document.getElementById("verificationCode");
      const phoneGroup = document.getElementById("phoneVerificationGroup");

      if (sendCodeBtn) {
        sendCodeBtn.addEventListener("click", () => {
          const appVerifier = window.recaptchaVerifier;
          this.auth.signInWithPhoneNumber(phoneInput.value, appVerifier)
            .then(confirmationResult => {
              window.confirmationResult = confirmationResult;
              phoneGroup.classList.remove("hidden");
              alert("Verification SMS sent!");
            })
            .catch(err => alert("Phone Auth SMS Error: " + err.message));
        });
      }

      if (verifyCodeBtn) {
        verifyCodeBtn.addEventListener("click", () => {
          if (!window.confirmationResult) return;
          window.confirmationResult.confirm(codeInput.value)
            .then(() => modal.classList.add("hidden"))
            .catch(err => alert("Invalid Code: " + err.message));
        });
      }

      // Logout Trigger
      const logoutBtn = document.getElementById("logoutBtn");
      if (logoutBtn) {
        logoutBtn.addEventListener("click", () => this.auth.signOut());
      }

      // Reserve Filter & Search Input
      const reserveSelect = document.getElementById("reserveSelect");
      const speciesSearch = document.getElementById("speciesSearch");

      const applyFilters = () => {
        const resVal = reserveSelect.value;
        const q = speciesSearch.value.toLowerCase().trim();

        const filtered = this.speciesData.filter(item => {
          const matchesReserve = (resVal === "ALL") || (item.reserves && item.reserves.includes(resVal));
          const matchesQuery = !q || item.species.toLowerCase().includes(q);
          return matchesReserve && matchesQuery;
        });
        this.renderSpeciesCards(filtered);
      };

      if (reserveSelect) reserveSelect.addEventListener("change", applyFilters);
      if (speciesSearch) speciesSearch.addEventListener("input", applyFilters);
    },

    updateSyncStatus(isCloud, labelText) {
      const syncElem = document.getElementById("syncStatus");
      if (syncElem) {
        syncElem.textContent = labelText;
        syncElem.style.color = isCloud ? "var(--success)" : "var(--accent-gold)";
      }
    }
  };

  App.init();
});
