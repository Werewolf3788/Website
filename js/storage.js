// js/storage.js
import { auth, db } from "./firebase-config.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.x.x/firebase-firestore.js";

export const StorageService = {
  // Save progress (Games, Movies, Pinned Platforms)
  async saveProgress(category, data) {
    const user = auth.currentUser;

    if (user) {
      // User is logged in -> Save to Firestore cloud
      await setDoc(doc(db, "users", user.uid, "data", category), data, { merge: true });
    } else {
      // Guest -> Save to device
      localStorage.setItem(`guest_${category}`, JSON.stringify(data));
    }
  },

  // Load progress
  async loadProgress(category) {
    const user = auth.currentUser;

    if (user) {
      // Load from Firestore
      const docSnap = await getDoc(doc(db, "users", user.uid, "data", category));
      return docSnap.exists() ? docSnap.data() : null;
    } else {
      // Load from local storage
      const local = localStorage.getItem(`guest_${category}`);
      return local ? JSON.parse(local) : null;
    }
  },

  // Migrate local data to cloud upon login
  async syncLocalToCloud() {
    const user = auth.currentUser;
    if (!user) return;

    const categories = ['games', 'movies', 'preferences'];
    for (const cat of categories) {
      const localData = localStorage.getItem(`guest_${cat}`);
      if (localData) {
        await setDoc(doc(db, "users", user.uid, "data", cat), JSON.parse(localData), { merge: true });
        localStorage.removeItem(`guest_${cat}`); // Clean up
      }
    }
  }
};
