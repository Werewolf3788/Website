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

## Game JSON conventions (game tracker)

Every game in `public/games/*.json` is cross-referenced with PlayStation trophies automatically by `game/Universal.js`:

- **Medals ↔ trophies:** a medal with the same name as a PSN trophy is synced (progress like 22/150 or 25%, and earned). Use `"psn_trophy": <trophyId>` on a medal to link it when the names differ.
- **Trophies → missions:** a trophy whose description is "Complete <mission title>" (or "Complete Mission N") ticks that mission when earned; trophies that mention a mission title, "Mission N" or a mission's region show "Happens in …".
- **Trophies → collectibles:** "Collect N personal letters / classified documents / hidden items", "Destroy N Dead-eye targets", "Interact with N workbenches" show the tracker's count on the trophy card.
- **Rank:** `"campaign_rank": { "max": 40, "trophyId": 9, "trophyIds": [9] }` fills the rank from the matching PSN trophies.
- **Hunting games:** trophies come from the PSN skeleton (playstation-stats); species names and "harvest N" trophies show your harvest counts.
- Trophy icons and progress always come from the playstation-stats project (PSN engine).

---

## 6. Game Data — Free to Reuse

The files in `public/games/*.json` are a standalone, hand-researched and
corrected dataset: collectible locations, mission lists, and progress
metrics for each supported game, cross-checked against official guides,
community wikis, and in-game verification. They are not just a database
for this site — they're intended as a reusable reference.

**License:** released under [CC0](./LICENSE-DATA.md) (public domain). Use
them in your own tracker, tool, wiki edit, dataset, or AI/LLM reference
pipeline, no permission or attribution required.

**Format:** one JSON file per game (e.g. `wdlegion.json`, `farcry5.json`),
each with a consistent shape: `game`, `platforms`, `boroughs`/`regions`,
`metrics`, `trophies`, and a `collectibles` object broken into typed
categories (e.g. `text_files`, `relics`, `audio_logs`), where each item has
an `id`, `name`, `region`, and a short `guide` describing how to find it.

**Coverage:** see the `public/games/` folder for the current list of
supported titles. Entries are added and corrected as they're verified —
if you spot something wrong or missing, it's a plain JSON file, so a pull
request is the fastest way to fix it.
