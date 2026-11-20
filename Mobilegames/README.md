# Mobilegames: Werewolf Board Games

Browser board games that run on Android, iOS and desktop. Same setup as Neighborly Acre: sign in with Google (same Firebase project), your friend code is your table code, and solo play works as a guest.

- `index.html` – hub (login, friend code, join by code)
- `wahoo.html` – Wahoo, 2-4 players. Empty seats can be filled with bots, and a friend can jump into a bot seat at any time. Live table state lives at `mobilegames/rooms/wahoo/{friendCode}/state`; wins save to `mobilegames/saves/{uid}/wahoo`.
- `tycoon.html` – Monopoly, a property-trading game (original names and cards). 2-4 players with bots, same seats/rooms/saves as Wahoo. State at `mobilegames/rooms/tycoon/{friendCode}/state`; wins save to `mobilegames/saves/{uid}/tycoon`. Rents rise every few rounds so games always finish. Rules: a blue Speed Die joins the two white dice once a player has passed or landed on Start (not used in jail; doubles count on the white dice only): 1/2/3 add to the move, Bus lets you move die 1, die 2 or the sum, Mr. Monopoly moves on to the next unowned property afterwards (or the next opponent property, paying rent), and a triple 1/2/3 lets you go anywhere. 4 houses make a hotel. Two doubles in a row goes to jail; bail is optional; Surprise and Community Fund cards can be followed or ignored.
- `mahjong.html` – Tile Match: solo mahjong-solitaire (six layered layouts, endless levels, undo/hint/shuffle, every deal solvable by construction). Progress and best times in localStorage; shows as "now playing" on friends' profiles.
- `survive.html` + `js/survive3d.js` – Tile Survival (3D, three.js): walk-around survivor who auto-chops/mines/hunts/fights, build/upgrade pads around the Power Plant (it caps other building levels), 5×5 map of fog areas unlocked with blue pads (forest, quarry, wild, infected camps, boss lairs), heroes Sarge/Rusty/Leila follow and fight, 21 Sarge missions with a guide arrow. Save in localStorage `ts3_save` + `mobilegames/saves/{uid}/survive3`; ally help via `mobilegames/rooms/survive/{friendCode}` (`pub` + `helps/{building_level}/{uid}`).
- `frogger.html` – Frogger: solo (endless, levels, 3 lives) or multiplayer for up to 8 players. Course: road (cars) → river (logs and turtles) → swamp (snakes, gators). Same deterministic hazards for everyone (room code + server clock); first to 5 crossings wins; live 🥇🥈🥉 leaderboard; synthesised sounds with a mute button. Room state at `mobilegames/rooms/frogger/{friendCode}` (`players`, `state`).
- `battleship.html` – Battleship: classic 10 × 10 grid (rows A–J, columns 1–10), five ships, one shot per turn. Solo vs the computer, or 2 players in a room (`mobilegames/rooms/battleship/{code}`). Synthesised cannon / splash / hit / sinking sounds and spoken call-outs, each with its own toggle.
- `race.html` + `js/race3d.js` – Werewolf Racing: 3D car racing. Solo vs 5 bots, or up to 8 drivers live in `mobilegames/rooms/race/{hostCode}` (`players/{uid}` live cars, `bots` the host's bots, `state` = rid / phase lobby-count-race-done / start time / laps / bots / `fin` finish times). Best lap goes to `mobilegames/leaders/race` (lower is better); finished races go to win/loss history.
- `js/gamepad.js` – shared Bluetooth/USB controller support (`window.WWPad`: PS5, PS4, Xbox and other standard controllers through the browser Gamepad API, with rumble where supported). Used by Werewolf Racing; other games can add it the same way.
- `js/common.js` – Firebase init, login, friend codes, saves, local (guest) fallback

Planned next: a life-path game, built on the same table/seat/turn pattern.

## One-time setup
Add the block from `database.rules.addition.json` into the Realtime Database rules (online tables are denied until then; solo play works without it).

## Friends and history
- While you sit at a table online, the game publishes a status to `users/{emailKey}/now_playing` (game, room code, a one-line status such as properties / houses / hotels, who is playing and how many seats are open). It is removed when you leave. The hub's "Friends playing now" list and the squad roster on the game tracker read it and show a Join button; PlayStation and Steam activity shows there too when the site already has it.
- Finished games are saved per player at `mobilegames/saves/{uid}/history` (win or loss, opponents, winner) and shown in the "Win / loss history" dropdown in the hub and in each game.
- Player avatars come from `users/{emailKey}/avatar_url`. Player shapes: circle, triangle, square, egg.
- Online tables use the generic `mobilegames/rooms/$game/$code` rule that is already in the site's `database.rules.json`, so `database.rules.addition.json` is only needed if that generic rule is ever removed.

## Resetting Neighborly Acre for everyone
Every farm save and every farm room carries a **season** number. When the season goes up, everyone (solo and multiplayer) starts again at level 1 with fresh fields, coins and animals the next time they open the game.
- In the game, the site owner sees **🔄 Reset farm for everyone** at the top of the 📜 Missions tab. It raises the season in Firebase (`mobilegames/rooms/farm/_season`).
- Or bump `SEASON` in `js/config.js`.

## Where the mobile games keep their data in Firebase (Realtime Database)
| Node | What it is |
|---|---|
| `mobilegames/saves/{uid}/farm` | Your solo Neighborly Acre progress (level/xp, coins, seeds, missions). `farm_mp_{CODE}` = your progress in a friend's multiplayer farm. `wahoo`, `tycoon`, `history` = board game wins and win/loss history. |
| `mobilegames/rooms/farm/{friendCode}` | Your solo farm world (fields, crops, animals, tractor). `MP-{CODE}` = a multiplayer farm. `_season` = the reset number. |
| `mobilegames/rooms/wahoo`, `tycoon`, `frogger`, `battleship` | Live tables for the other games. |
| `mobilegames/rooms/presence/{friendCode}` | "Playing now" status the hub shows to friends. |
| `mobilegames/leaders/{game}` | Leaderboards. |
| `achFeed` | Achievement pop-ups shown to everyone on the site. |

The database is grouped: `users` and `user_secrets` at the top, then `accounts/` (friend codes, profiles, presence, sign-in links, push), `social/` (messages, userThreads, achFeed), `site/` (music releases, Wi-Fi), `platforms/` (games, Steam, Xbox) and `mobilegames/` (rooms, leaders, saves).
## Neighborly Acre data layout (Firebase)
- `mobilegames/saves/{uid}/farm` (solo) or `farm_mp_{code}` (multiplayer): your private full save (level/xp, coins, seeds, bag, upgrades, combine, trailer, haul, `epoch`).
- `mobilegames/rooms/farm/{room}/farmers/{uid}`: one readable record per farmer: `name, level, xp, coins, fields, animals, harvested, combine, avatar, color, tractor{x,z,ry}, updated`.
- `mobilegames/rooms/farm/{room}`: `meta` (host, `epoch`), `tiles` (k: t=plowed, c=crop; c=crop id, p=planted, w=watered time, u=cultivated, f=fertilized), `fields` (owners), `animals`, `players` (live positions), `ledger` (shared animal money/XP).
- Reset one farm: its host opens barn > Settings > Reset. This wipes the room and bumps `meta/epoch`; every farmer in that farm restarts at level 1 the next time they connect.
- Reset every farm: see "Resetting Neighborly Acre for everyone" above (season).
- Harvest chain: Combine harvester (tractor shop) > drive it over ripe crops > park beside the trailer to unload > walk to the trailer and send the truck to the grain elevator (+15% price). The truck and trailer are only drawn on your own screen.
