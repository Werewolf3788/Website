/* ============================================================================
   File: firebase-auth-pipeline.js
   Version: 1.0.6 | Updated: 2026-07-30T00:55:00Z
   Description: Firebase Auth, Analytics, Auto-Anon Cleanup & Multi-Platform Pipeline
   Project: entertainment-71888
   ============================================================================ */

/* === SECTION: Firebase SDK Imports & Global Handles === */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js?v=20260730";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-analytics.js?v=20260730";
import { 
    getAuth, 
    signInAnonymously, 
    onAuthStateChanged, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut,
    deleteUser 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js?v=20260730";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js?v=20260730";

// Global Instance Handles
let app;
let auth;
let db;
let analytics;

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

/* === SECTION: Authentication & Analytics Initialization === */
function initializeAuthentication(config = firebaseConfig, gameId, platform = "pc") {
    app = initializeApp(config, `${gameId}-Auth-App`);
    auth = getAuth(app);
    db = getFirestore(app);
    analytics = getAnalytics(app);

    // Initial Anonymous Auth Fallback
    signInAnonymously(auth).catch((err) => console.warn("Anonymous Auth Warning:", err));

    // Session State Listener
    onAuthStateChanged(auth, (user) => {
        handleAuthStateChange(user, gameId, platform);
    });
}

function handleAuthStateChange(user, gameId, platform = "pc") {
    const googleSignInBtn = document.getElementById("googleSignInBtn");
    const signOutBtn = document.getElementById("signOutBtn");
    const userProfileStatus = document.getElementById("userProfileStatus");
    const userAvatar = document.getElementById("userAvatar");
    const demoBanner = document.getElementById("demoNotification");
    const adminBadge = document.getElementById("adminBadge");

    // 1. Bind Google Login Popup Event with Anonymous Account Cleanup
    if (googleSignInBtn && !googleSignInBtn.dataset.listener) {
        googleSignInBtn.dataset.listener = "true";
        googleSignInBtn.addEventListener("click", async () => {
            const tempAnonUser = auth.currentUser && auth.currentUser.isAnonymous ? auth.currentUser : null;
            const provider = new GoogleAuthProvider();
            
            try {
                const result = await signInWithPopup(auth, provider);
                
                // If sign-in succeeds and an old anonymous user exists, clean up the anonymous session
                if (tempAnonUser) {
                    deleteUser(tempAnonUser).catch(() => {
                        // Suppress error if token already invalidated by auth provider switch
                    });
                }

                provisionAndSyncUser(result.user, gameId, platform);
            } catch (err) {
                console.error("Google Authentication Rejected:", err);
            }
        });
    }

    // 2. Bind Logout Event
    if (signOutBtn && !signOutBtn.dataset.listener) {
        signOutBtn.dataset.listener = "true";
        signOutBtn.addEventListener("click", () => {
            signOut(auth).then(() => {
                if (demoBanner) demoBanner.classList.remove("hidden");
                if (adminBadge) adminBadge.classList.add("hidden");
                if (googleSignInBtn) googleSignInBtn.classList.remove("hidden");
                if (userProfileStatus) userProfileStatus.classList.add("hidden");
                if (userAvatar) userAvatar.src = "";
                
                // Re-authenticate anonymously on logout for public viewing
                signInAnonymously(auth).catch((err) => console.warn("Anon Auth re-init warning:", err));
            });
        });
    }

    // 3. UI Update & User Data Sync
    if (user && !user.isAnonymous) {
        if (demoBanner) demoBanner.classList.add("hidden");
        if (googleSignInBtn) googleSignInBtn.classList.add("hidden");
        if (userProfileStatus) userProfileStatus.classList.remove("hidden");
        if (userAvatar) userAvatar.src = user.photoURL || "";

        // Admin Email Hook
        if (user.email === "raykevin71888@gmail.com") {
            if (adminBadge) adminBadge.classList.remove("hidden");
        } else {
            if (adminBadge) adminBadge.classList.add("hidden");
        }

        // Provision / Update Firestore Record
        provisionAndSyncUser(user, gameId, platform);
    } else {
        if (demoBanner) demoBanner.classList.remove("hidden");
        if (adminBadge) adminBadge.classList.add("hidden");
        if (googleSignInBtn) googleSignInBtn.classList.remove("hidden");
        if (userProfileStatus) userProfileStatus.classList.add("hidden");
        if (userAvatar) userAvatar.src = "";
    }
}

/* === SECTION: User Provisioning & Nested Platform Data Auto-Update === */
async function provisionAndSyncUser(user, gameId, platform = "pc") {
    if (!db || !user || user.isAnonymous) return;

    const activeUsername = user.displayName || user.email.split('@')[0];
    const sanitizedPlatform = (platform || "pc").toLowerCase();

    // Firestore Path: /users/{activeUsername}
    const userRef = doc(db, 'users', activeUsername);
    
    // Firestore Nested Path: /users/{activeUsername}/progress/{platform}/games/{gameId}
    const userProgressRef = doc(db, 'users', activeUsername, 'progress', sanitizedPlatform, 'games', gameId);

    const userPayload = {
        displayName: activeUsername,
        email: user.email || "",
        photoURL: user.photoURL || "",
        uid: user.uid,
        lastUpdated: new Date().toISOString()
    };

    try {
        await setDoc(userRef, userPayload, { merge: true });

        const platformRef = doc(db, 'users', activeUsername, 'progress', sanitizedPlatform);
        await setDoc(platformRef, { platform: sanitizedPlatform, lastActive: new Date().toISOString() }, { merge: true });

        const progressSnap = await getDoc(userProgressRef);
        if (!progressSnap.exists()) {
            await setDoc(userProgressRef, {
                user: activeUsername,
                platform: sanitizedPlatform,
                gameId: gameId,
                lastUpdated: new Date().toISOString()
            }, { merge: true });
        }

        console.log(`Identity & platform progress synced for: ${activeUsername} [${sanitizedPlatform} / ${gameId}]`);
    } catch (error) {
        console.error("Error writing multi-platform user record to Firestore:", error);
    }
}
