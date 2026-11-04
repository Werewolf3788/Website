# Claude-Test: Werewolf Game Hub (Neighborly Acre)

Browser games that run on Android, iOS and desktop. Sign in with Google (same Firebase project as the Game Tracker); your friend code is your room code.

- `index.html` – hub (login, friend code, host/join)
- `farm.html` – Neighborly Acre, a co-op farm (stage 1). Works solo as a guest (saves on the device) or signed in (saves online, friends can join anytime). Shared farm lives at `game_rooms/farm/{friendCode}`; each player's coins save to `games_saves/{uid}/farm`.
- `js/farm3d.js` + `js/world.js` – the 3D game (three.js bundle in `js/three.min.js`, no CDN needed)
- `js/common.js` – Firebase init, login, friend codes, saves
- Sniper and Open World are planned next.

## One-time setup
Paste the two blocks from `database.rules.addition.json` into the Realtime Database rules (the games are denied until then), and make sure the site's domain is under Authentication > Settings > Authorized domains.
