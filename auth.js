/* Version Timestamp: 2026-07-22 16:35:00 CT
   LOGIC PROTOCOL: Firebase v9+ Modular Google Auth Controller
   RESILIENCE PATTERNS: Cross-Tab Session Sync, Non-Destructive Profile Merging, Token Refresh Observers
*/

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged, 
  onIdTokenChanged 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA_O_Qm3bazJpi6wPqafsKLNNJdIUCvQGM",
  authDomain: "game-tracker-5b2ef.firebaseapp.com",
  databaseURL: "https://game-tracker-5b2ef-default-rtdb.firebaseio.com",
  projectId: "game-tracker-5b2ef",
  storageBucket: "game-tracker-5b2ef.firebasestorage.app",
  messagingSenderId: "555667047127",
  appId: "1:555667047127:web:fc70f96b04d0380a9aa692"
};

// Singleton Initialization
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

/**
 * Executes Non-Destructive Profile Creation/Update on Login
 */
async function syncUserProfile(user) {
  if (!user) return;

  const userDocRef = doc(db, "users", user.uid);
  const isAdmin = user.email === 'raykevin71888@gmail.com';
  
  const profileData = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || 'Operative',
    photoURL: user.photoURL || '',
    role: isAdmin ? 'admin' : 'user',
    lastLogin: serverTimestamp()
  };

  try {
    // Rule 1: Use set() with { merge: true } to prevent erasing existing user stats
    await setDoc(userDocRef, profileData, { merge: true });
  } catch (err) {
    console.warn("Profile merge failed:", err.message);
  }
}

/**
 * Google Auth Login Flow
 */
export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await syncUserProfile(result.user);
    return result.user;
  } catch (err) {
    console.error("Google Auth execution failed:", err.message);
    throw err;
  }
}

/**
 * Logout Flow
 */
export async function logoutUser() {
  try {
    await signOut(auth);
  } catch (err) {
    console.error("Sign-out error:", err.message);
  }
}

/**
 * Rule 2: Cross-Tab Session Sync Listener & Token Observer
 * Call this on page boot to listen for active login state across new tabs.
 */
export function initAuthSync(onUserChanged) {
  // Listen for active sessions across tabs
  const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
    if (user) {
      await syncUserProfile(user);
    }
    if (typeof onUserChanged === 'function') {
      onUserChanged(user);
    }
  });

  // Keep network streams alive when JWT tokens refresh in background
  const unsubscribeToken = onIdTokenChanged(auth, (user) => {
    if (user && typeof onUserChanged === 'function') {
      onUserChanged(user);
    }
  });

  // Cleanup handler for vanilla JS or React useEffect
  return () => {
    unsubscribeAuth();
    unsubscribeToken();
  };
}
