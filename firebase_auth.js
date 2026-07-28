/* === SECTION: Persistent Firebase Auth State & Session Management === *//*
    File Version: 1.0.0
    Timestamp: 2026-07-28
    Description: Configures Firebase Auth persistence to LOCAL so the user remains signed in across tabs, refreshes, and browser restarts. Ensures local settings and states are preserved.
*/

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, setPersistence, browserLocalPersistence, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

// User Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyA_O_Qm3bazJpi6wPqafsKLNNJdIUCvQGM",
  authDomain: "game-tracker-5b2ef.firebaseapp.com",
  databaseURL: "https://game-tracker-5b2ef-default-rtdb.firebaseio.com",
  projectId: "game-tracker-5b2ef",
  storageBucket: "game-tracker-5b2ef.firebasestorage.app",
  messagingSenderId: "555667047127",
  appId: "1:555667047127:web:fc70f96b04d0380a9aa692"
};

// Initialize Firebase App, Auth, and Database
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const googleProvider = new GoogleAuthProvider();

// FORCE PERSISTENCE: Keeps user signed in across tabs, windows, and refreshes
setPersistence(auth, browserLocalPersistence)
  .catch((error) => console.error("Persistence Error:", error));

// DOM Elements
const authActionButton = document.getElementById("auth-action-btn");
const adminElements = document.querySelectorAll(".admin-only");

// Handle Auth Action (Login / Logout Toggle)
authActionButton.addEventListener("click", () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
        signOut(auth).catch((error) => console.error("Sign Out Error:", error));
    } else {
        signInWithPopup(auth, googleProvider)
            .catch((error) => console.error("Authentication Error:", error));
    }
});

// Real-Time Auth State Monitor (Preserves user session state globally)
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("Session Active:", user.email);
        authActionButton.textContent = "Sign Out";
        adminElements.forEach(el => el.classList.remove("restricted-view"));
    } else {
        console.log("View-Only Mode Active");
        authActionButton.textContent = "Sign In with Google";
        adminElements.forEach(el => el.classList.add("restricted-view"));
    }
});
