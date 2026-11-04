# Mobilegames: Werewolf Board Games

Browser board games that run on Android, iOS and desktop. Same setup as Neighborly Acre: sign in with Google (same Firebase project), your friend code is your table code, and solo play works as a guest.

- `index.html` – hub (login, friend code, join by code)
- `wahoo.html` – Wahoo, 2-4 players. Empty seats can be filled with bots, and a friend can jump into a bot seat at any time. Live table state lives at `game_rooms/wahoo/{friendCode}/state`; wins save to `games_saves/{uid}/wahoo`.
- `tycoon.html` – Property Tycoon, a property-trading game (original names and cards). 2-4 players with bots, same seats/rooms/saves as Wahoo. State at `game_rooms/tycoon/{friendCode}/state`; wins save to `games_saves/{uid}/tycoon`. Rents rise every few rounds so games always finish.
- `js/common.js` – Firebase init, login, friend codes, saves, local (guest) fallback

Planned next: a life-path game, built on the same table/seat/turn pattern.

## One-time setup
Add the block from `database.rules.addition.json` into the Realtime Database rules (online tables are denied until then; solo play works without it).
