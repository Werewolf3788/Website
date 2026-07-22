<!-- Version Timestamp: 2026-07-22T21:25:00.000Z -->
# 🐺 Werewolf Project - Gaming & Hub Portal

A dynamic, multi-user gaming progression hub, live tracker, and cross-platform dashboard built with **vanilla Web Standards**, **Firebase v9+ Modular Web SDK**, **Google Authentication**, and hosted live on **GitHub Pages**.

---

## 🌟 Key Features

*   **Real-time Game Trackers:** Live dynamic progression tracking for *theHunter: Call of the Wild*, *Sniper Elite Resistance*, *Sniper Elite 5*, and *Farming Simulator 25* using Firebase Firestore (`onSnapshot`) and Realtime Database (`onValue`).
*   **Dynamic Profile System:** Auto-binding Google Accounts (`/users/{uid}`) with cross-tab auto-login observers (`onAuthStateChanged`) and Page Visibility re-connection loops.
*   **Centralized Navigation (`Menu.json`):** Dynamic, category-grouped menu powered by a single JSON data feed with auto cache-busting (`?v=timestamp`).
*   **Automated Sync Workflows:** GitHub Actions automation handling background updates for PSN token synchronization and FS25 live game backups.
*   **Cross-Tab Jump Focus:** `BroadcastChannel` protocol to intercept external links and jump focus to existing open tabs instead of opening duplicates.
*   **High-Contrast Branding:** Responsive Dark Slate Charcoal (`#1e1c1c`) container layout with high-contrast corporate red action buttons and fixed dual-mode visual styling.

---

## 📁 Repository Structure

```text
/ (Root)
├── .github/workflows/    # Automated GitHub Actions sync scripts (PSN Sync & FS25 Backups)
├── .nojekyll             # Prevents Jekyll processing on GitHub Pages
├── README.md             # Project documentation and setup guide
├── index.html            # Main site landing page
├── Menu.json             # Global dynamic navigation configuration
├── Movies.html           # Media and entertainment dashboard
├── auth.js               # Firebase authentication & lifecycle observers
├── games/                # Game checklist modules & live tracker dashboards
│   ├── FS25/
│   ├── HunterCOTW/
│   ├── Sniper-Elite/
│   └── Tom-Clancy/
├── images/               # Shared media assets & profile avatars
├── Playstation/          # PSN API & token sync scripts
├── users/                # Individual user profile & progress portals
└── tools/                # Utility tools, QR relays, and helper scripts
