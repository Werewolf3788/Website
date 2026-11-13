# Mobilegames: Werewolf Board Games

Browser board games that run on Android, iOS and desktop. Same setup as Neighborly Acre: sign in with Google (same Firebase project), your friend code is your table code, and solo play works as a guest.

- `index.html` – hub (login, friend code, join by code)
- `wahoo.html` – Wahoo, 2-4 players. Empty seats can be filled with bots, and a friend can jump into a bot seat at any time. Live table state lives at `game_rooms/wahoo/{friendCode}/state`; wins save to `games_saves/{uid}/wahoo`.
- `tycoon.html` – Monopoly, a property-trading game (original names and cards). 2-4 players with bots, same seats/rooms/saves as Wahoo. State at `game_rooms/tycoon/{friendCode}/state`; wins save to `games_saves/{uid}/tycoon`. Rents rise every few rounds so games always finish.
- `frogger.html` – Frogger: solo (endless, levels, 3 lives) or multiplayer for up to 8 players. Everyone shares the same deterministic traffic (seeded by the room code + server clock); first to 10 crossings wins. Room state at `game_rooms/frogger/{friendCode}` (`players`, `state`).
- `js/common.js` – Firebase init, login, friend codes, saves, local (guest) fallback

Planned next: a life-path game, built on the same table/seat/turn pattern.

## One-time setup
Add the block from `database.rules.addition.json` into the Realtime Database rules (online tables are denied until then; solo play works without it).

## Friends and history
- While you sit at a table online, the game publishes a status to `users/{emailKey}/now_playing` (game, room code, a one-line status such as properties / houses / apartments, who is playing and how many seats are open). It is removed when you leave. The hub's "Friends playing now" list and the squad roster on the game tracker read it and show a Join button; PlayStation and Steam activity shows there too when the site already has it.
- Finished games are saved per player at `games_saves/{uid}/history` (win or loss, opponents, winner) and shown in the "Win / loss history" dropdown in the hub and in each game.
- Player avatars come from `users/{emailKey}/avatar_url`. Player shapes: circle, triangle, square, egg.
- Online tables use the generic `game_rooms/$game/$code` rule that is already in the site's `database.rules.json`, so `database.rules.addition.json` is only needed if that generic rule is ever removed.
