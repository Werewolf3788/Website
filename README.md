# Gaming Companions & Field Ledger Blueprint

This guide explains how games on **entertainment-71888** are set up so future titles follow the exact same structure.

---

## 1. The Two Databases

### Realtime Database (RTDB)
- **What it does:** Handles player accounts, gamer tags, friend codes, and the top navbar.
- **Key Locations:**
  - `/utm_links` : Feeds the top menu links remotely from your spreadsheet.
  - `/users/{emailKey}` : Stores your profile, friend code, and linked gaming IDs (PSN, Xbox, Steam).
  - `/users/{emailKey}/friends` : Stores squad members added via friend codes.
  - `/psn/games` & `/psn/gamertags` : Stores game trophy data and live earned progress.

### Cloud Firestore
- **What it does:** Saves all checklist checkmarks, mission progress, and game numbers.
- **Universal Save Path:**
  `/users/{emailKey}/platform/{platform}/progress/{gameName}`
  *(Example: `/users/raykevin71888_at_gmail_com/platform/ps/progress/FarCry5`)*

---

## 2. Platforms Supported

Every game has switchable platform options:
- `ps` (PlayStation)
- `pc` (PC / Windows)
- `xbox` (Xbox Network)
- `steam` (Steam)

Switching platforms in the companion automatically switches the save path to that platform's folder.

---

## 3. Top Metrics Strip

The top tactical bar tracks progress across these categories:
- **RP:** Resistance / Experience points
- **Outposts:** Bases liberated
- **Cult Property / Objectives:** Map structures destroyed
- **Stashes:** Prepper bunkers opened
- **Roster:** Specialists and companions recruited
- **Perks:** Magazines collected
- **Collectibles:** Quest items found (cards, lighters, bobbleheads, etc.)

---

## 4. How Squad / Friend Progress Works

1. You share your 8-digit **Friend Code**.
2. When a friend adds your code, the system looks up your account in RTDB.
3. The app connects to your Firestore progress using the currently selected platform (`ps`, `pc`, etc.).
4. The friend card shows your current RP, Stashes, and Collectibles side by side with your squad.

---

## 5. Adding a New Game (Quick Steps)

1. Put the game's item checklist data in `/game/data/{game_name}.json`.
2. In your companion script, set the game name to match:
   `progress/{game_name}` (like `COTW`, `sniper-elite-5`, `woth2`, `FarCry5`).
3. Add a row in your Google Sheet with the game name, poster picture, and URL path (`/fc5`).
