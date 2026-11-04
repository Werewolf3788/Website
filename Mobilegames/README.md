# Mobilegames: Werewolf Board Games

Browser board games that run on Android, iOS and desktop. Same setup as Neighborly Acre: sign in with Google (same Firebase project), your friend code is your table code, and solo play works as a guest.

- `index.html` – hub (login, friend code, join by code)
- `wahoo.html` – Wahoo, 2-4 players. Empty seats can be filled with bots, and a friend can jump into a bot seat at any time. Live table state lives at `game_rooms/wahoo/{friendCode}/state`; wins save to `games_saves/{uid}/wahoo`.
- `js/common.js` – Firebase init, login, friend codes, saves, local (guest) fallback

Planned next: a property-trading game and a life-path game, built on the same table/seat/turn pattern.

## One-time setup
Add the block from `database.rules.addition.json` into the Realtime Database rules (online tables are denied until then; solo play works without it).
