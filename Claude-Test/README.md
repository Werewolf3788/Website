# Claude-Test: Werewolf Game Hub (Neighborly Acre)

Browser games that run on Android, iOS and desktop. Sign in with Google (same Firebase project as the Game Tracker); your friend code is your room code.

- `index.html` – hub (login, friend code, host/join)
- `farm.html` – Neighborly Acre, a co-op farm (stage 1). Works solo as a guest (saves on the device) or signed in (saves online, friends can join anytime). Shared farm lives at `game_rooms/farm/{friendCode}`; each player's coins save to `games_saves/{uid}/farm`.
- `js/config.js` – game rules: 9 crops + levels, animals, recipes, upgrades, deterministic rain, real-clock sky, orders
- `js/farm3d.js` + `js/world.js` – the 3D game (three.js bundle in `js/three.min.js`, no CDN needed)
- `js/gamenav.js` – shared ☰ Games menu (the same file is also in `Mobilegames/js/`; add new games to its `GAMES` list in both copies)
- `js/common.js` – Firebase init, login, friend codes, saves
- Sniper and Open World are planned next.

## One-time setup
Publish the repo's root `database.rules.json` in Firebase Console > Realtime Database > Rules (the games are denied until then; `game_rooms/$game/$code` covers the farm, Wahoo and future games), and make sure the site's domain is under Authentication > Settings > Authorized domains.

## Notes
- Time of day follows the player's device clock. Rain is shared by everyone: two random 3–6 minute showers every hour (one per half hour, so a crop never waits an hour for rain), computed from the time so crops are also watered retroactively.
- XP: harvest +5, egg +1, wool +2, milk +3. Level 1→2 needs 25 xp, then 50, 75, … up to level 50. Missions (3 daily + milestone ladders) pay bonus XP and coins; level-ups pay `25 × level` coins.
- Signed-in players save only to Firebase; guests save to this device.
- Debug URL params: `?time=14.5` (hour), `?weather=rain|clear`.
