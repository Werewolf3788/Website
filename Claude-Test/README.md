# Claude-Test: Werewolf Game Hub

Browser games that run on Android, iOS and desktop. Sign in with Google (same Firebase project as the Game Tracker); your friend code is your room code.

- `index.html` – hub (login, friend code, host/join)
- `farm.html` – co-op farm (stage 1). Shared farm lives at `game_rooms/farm/{friendCode}`; each player's coins save to `games_saves/{uid}/farm`.
- `js/common.js` – Firebase init, login, friend codes, saves
- Sniper and Open World are planned next.

## One-time setup
Paste the two blocks from `database.rules.addition.json` into the Realtime Database rules (the games are denied until then), and make sure the site's domain is under Authentication > Settings > Authorized domains.
