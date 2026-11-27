# Werewolf Twitch Extension — design

Status: **approved by Kevin 2026-11-26** · Date: 2026-11-26 · Owner: Kevin (werewolf3788) · Repo: Werewolf3788/Website

## Why

Kevin wants every streamer — starting with his crew (TJ, Ray, Phoenix) and then anyone who finds Overlay Studio —
to get a free, good-looking, interactive overlay on Twitch without paying for Lightstream, and he wants it to
**promote him and his site** (entertainment-71888.web.app). Paid tiers bring in money through Buy Me a Coffee.

Success: Kevin's and his friends' channels show the overlay on desktop and phones; outside streamers can set it up
from Overlay Studio on their own; it never pushes his Firebase free plan into charges; Twitch approves it.

Anti-goals (would be a failure even if it works):
- viewer traffic that grows Firebase / Render usage with audience size
- anything Twitch review rejects: ads, Buy Me a Coffee links/QR codes in the extension, promoting Kevin's live stream
- using any streamer's PlayStation sign-in for anyone but themselves and Kevin's crew pool

## What viewers see

```
┌ Allies in the same game ◀ 1/2 ▶ ┐┌ werewolf3788 is playing ────────┐
│ [poster] Wildlands              ││ [poster] Ghost Recon Wildlands  │
│ OneLIVIDMAN (Ray)               ││ "Hunting Santa Blanca bosses"   │
│ Level 24 · Rebel ops 27/62      ││ Level 28 · Skill points 14      │
│ [View more]                     ││ Rebel ops 31/62  ▓▓▓▓▓░░░░░     │
└─────────────────────────────────┘│ [View more]                     │
                                   └─────────────────────────────────┘
  Track your own games at entertainment-71888.web.app
```

- **Right — the channel's streamer (always):** profile picture, current game poster, game name, status, tracker summary.
- **Left — allies (optional, streamer can turn off):** anyone whose **PlayStation shows the same game title** (status
  doesn't have to match) **and** is a linked ally, plus any streamer in the channel's **Twitch Stream Together / Shared
  Chat** session who has paired the extension. More than one → a carousel the viewer can page through.
- **View more** on any card: that person's other games and progress (read-only).
- Viewers can look and tap only — no sign-in, no saving (Kevin picked "look only" now; "compare with your own progress"
  is a later add).
- **Desktop:** video overlay (sits over the stream; collapsed to a small button until opened). **Phone:** Twitch's
  mobile view, same content stacked full-width.
- No Twitch chat inside the extension (viewers already have chat; Twitch limits how fast a server can push).

### Game info: PlayStation first, then Twitch
1. PlayStation (only for streamers who gave their PSN Account ID + NPSSO in Settings → PlayStation sync, or crew):
   poster, game name, game status from live PSN presence.
2. Otherwise Twitch: category box art, category name, stream title.
3. Non-game category ("Just Chatting") → profile picture instead of box art. Offline → profile picture + tracker + "offline".

PlayStation sign-ins used: the streamer's own NPSSO first; then Kevin's crew pool (Kevin, Ray, TJ, Marc) for the crew
and, very lightly, for others; Kevin gets a notification when a crew sign-in fails. **Outside streamers' NPSSOs are
never used for anyone else** (Kevin dropped that idea). PSN privacy still applies (crew sign-ins only see people who
are PSN friends or show status to Anyone).

## Tiers (one pass covers the extension AND Overlay Studio's browser overlay)

| Tier | Needs | Gets | Monthly | Yearly |
|---|---|---|---|---|
| Free | install only | Twitch basics + watermark | $0 | — |
| 1 | — | Twitch basics, no watermark | $5 | $50 |
| 2 | site account + friend code | + tracker, View more, Stream Together allies | $10 | $100 |
| 3 | friend code + PSN ID/NPSSO | + live PlayStation info, same-game allies | $20 | $200 |

Lifetime options: see Decided §5.

- Yearly = 10× monthly (2 months free), like Overlay Studio today.
- Paid on Buy Me a Coffee with the claim-code system already built (`server/discord-auth/bmc.js`); passes add time on top,
  stored in `overlay_pro/{account}` with a new `tier` field. Existing Overlay Studio passes count as Tier 1.
- **Allies (Kevin's friends list) get Tier 3 free.** One price for everyone (no Affiliate/Partner bump).

### Watermark (Free tier)
- Kevin's **current Twitch profile picture + "werewolf3788"**, looked up from Twitch about once a day (follows picture
  changes; tied to his account ID so a rename doesn't break it).
- About **75% visible** for ~10 seconds, at a **random spot around the edges/corners** — never the centre and never over
  Twitch's player buttons.
- **When (Kevin):** after a **random 20–40 minutes of live time** since the last one. Live time **carries over between
  streams**, so ending at 29 min and restarting doesn't dodge it. It only shows while Twitch's viewer count is **2 or
  more**; if fewer are watching it waits until there are. The server picks the moment and sends it in the card, so every
  viewer sees it at the same time. Never while offline.
- Tapping opens Kevin's site. **No current game, no Buy Me a Coffee, no QR code in the extension** (Twitch review).
- Overlay Studio's browser-source overlay (free) uses the same picture + handle, and may add a Buy Me a Coffee QR code.

## How it's built (approach A — picked by Claude, Kevin went along)

| Approach | Trade-off | |
|---|---|---|
| **A. Server pushes through Twitch** | Viewers never touch Firebase/Render; cost flat with any audience; uses Twitch Extension PubSub (not affected by PubSub shutdown) + Twitch's config storage | **chosen** |
| B. Each viewer reads Firebase | simplest; usage grows with viewers → free-plan risk | rejected |
| C. Each viewer calls Render | Render free plan sleeps (30–60 s waits); load grows with viewers | rejected |

### Parts
1. **Extension front end** — `overlay/extension/` (uploaded to Twitch as a zip):
   `video_overlay.html` (desktop), `mobile.html`, `config.html` (broadcaster only), shared `ext.js` / `ext.css`.
   Listens for the broadcast message; reads the last card from Twitch's broadcaster config segment on load.
   Includes the site's GA tags (G-Z9M5LXQ5XN, G-CTYHDF4MSD), no personal data sent.
2. **Back end — `ww-stream-sync`** (already checks PSN every 30 s while live): new `lib/extension.js`.
   - Twitch EventSub webhooks per paired channel: `stream.online` / `stream.offline` / `channel.update` /
     `channel.shared_chat.begin|update|end` — these also wake Render.
   - While a paired channel is live: every ~60 s build the channel's **card** (≤5 KB) and, only when it changed (plus a
     slow heartbeat), send it with *Send Extension PubSub Message* (broadcast) and save it to the broadcaster config
     segment so new viewers see it instantly.
   - Tier decides what goes in the card. Allies = same PSN title (crew/allies data already read) + Shared Chat participants
     (*Get Shared Chat Session*) who are paired.
3. **View more** — loaded only when a viewer taps: that person's tracker from Firestore
   `user/{CODE}/platform/{platform}/game` (public tracker data, small read). *Builder: confirm Firestore rules allow public
   read of tracker data (profile.html already reads it), and add firestore.googleapis.com to the extension's allowed URLs.*
4. **Pairing** — `config.html` shows a code (e.g. `WOLF-4821`) and "Finish setup at Overlay Studio". In Overlay Studio the
   streamer enters it → server links Twitch channel ID ↔ Twitch login ↔ friend code (if signed in) in Firestore
   `ext_channels/{channelId}`. No friend code → Twitch-only. Opening `config.html` once (broadcaster JWT) is what tells
   the server a channel installed it, so even unpaired installs get Twitch basics after that first visit.
5. **Overlay Studio** — new output choice **"Twitch extension"**: same design; anything the extension can't do (chat box,
   sound alerts, …) shows greyed out with "only works in OBS/Streamlabs". Pair box + tier/pass purchase live here.
6. **Keys** — Twitch Extension Client ID + Extension Secret (base64) go in the Keys sheet → Key Vault
   (`twitch_ext_client_id`, `twitch_ext_secret`); server reads them automatically.

### Kevin's manual steps (only he can)
- dev.twitch.tv → Extensions → create "Werewolf Overlay" (needs 2FA); types: Video Overlay + Mobile; turn on the
  broadcaster config page and Twitch's config storage; allowlist URLs (ww-stream-sync, Firestore, PSN image CDN, GA).
- Paste Client ID + secret into the two Keys sheet rows Claude adds.
- Upload the zip Claude builds, add test channels (werewolf3788, terrdog420, raymystyro, Phoenix_Darkfire), then submit for review.
- Make the Buy Me a Coffee shop items for the tiers.

## Decided (Kevin, 2026-11-26)
1. **Prices locked for life:** $5 / $10 / $20 monthly, $50 / $100 / $200 yearly. They never go up; say so on the pricing page.
   (Kevin: Lightstream basic is $8/mo or $88/yr, its 720p Gamer plan $25/mo.)
2. **Tier 2 stays paid.**
3. **One price for everyone** — no Affiliate/Partner bump. This replaces Overlay Studio's old $8/$80 earner price.
4. **Allies (Kevin's friends list) get Tier 3 free** and show the Founder-style monthly credit (Kevin, 2026-11-26), except on Kevin's own channel.
5. **Lifetime passes (optional, one payment, "for the lifetime of the service"):**

   | | Tier 1 | Tier 2 | Tier 3 | Watermark |
   |---|---|---|---|---|
   | Founder lifetime (first 25 buyers) | $99 | $199 | $399 | small werewolf3788 credit **once a month** (~10 s) |
   | Full lifetime | $125 | $250 | $500 | none, ever |

   - Founder terms must be shown on the buy button + pricing page, and agreed with a checkbox before the claim code is
     issued; the agreement (terms version + time) is saved with the claim. Short terms page on the site.
   - Never add the monthly credit to anyone who didn't agree to it.
   - Founder credit timing (Kevin): calendar-based — the first stream **30+ days** after the last credit shows it once,
     at **5 minutes of uptime or later, once the viewer count is 2+**; missed months don't pile up; if it doesn't get
     shown, it waits for the next stream.
   - Upgrades credit what was paid (Tier 1 lifetime → Tier 3 lifetime pays the difference); monthly/yearly buyers keep
     their remaining time when they switch.

## Left to the builder
File layout inside `overlay/extension/`, card JSON shape, exact poll/heartbeat timing within Twitch limits, carousel UI,
how the existing `overlay_pro` passes migrate to tiers, tests for card building and tier gating.

## Update 2026-11-26 (Kevin)
- The credit reads "🐺 Overlay by werewolf3788" and tapping it opens `overlay-studio#extension` (not the home page).
- Allies show the monthly credit; Kevin's own channel never does.
