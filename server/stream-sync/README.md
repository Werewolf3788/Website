# ww-stream-sync

Render service that keeps the stream info in step with what you're playing on PlayStation.
The PlayStation game + status set the Twitch title and category, that same title goes to YouTube and Kick, and YouTube / TikTok / Kick chat comes back into Twitch chat.

While you're **live on Twitch** it checks every 30 seconds and:

| What | Where |
|---|---|
| Fixes the category to the PlayStation game (no more "Games + Demos") | Twitch, Kick |
| Title = PlayStation game status (or game name) + `w/ @friend` for squad members in the same game | Twitch, YouTube, Kick |
| Sets your tags (`base_tags`, plus `game_tags` for the current game) once per stream | Twitch |
| Posts one "now live" alert | Discord webhook |
| Relays YouTube, TikTok and Kick chat into Twitch chat (as your bot or your own account - your pick) | Twitch |

PlayStation limits how often its API can be called, so the live PSN check is rationed: once when the stream starts, then at most once every `psn_poll_minutes` (default 5), only while live, using your own NPSSO. In between (and if PSN says "too many requests") it reuses the last answer or reads the PlayStation database that the 21-minute GitHub sync writes. Set `psn_poll_minutes` to `0` to never call PSN from here and use only the database.

Render's free plan sleeps after ~15 minutes without visits. The Apps Script **StreamHook** (`server/stream-sync/StreamHook.gs`) visits `/wake` every minute while you're live, so the service runs only during streams.

A title you change by hand stays until the game status or squad changes. The category is always put back to the right game.

## Setup page (any site user)

**https://entertainment-71888.web.app/server/stream-sync/setup** (`setup.html`; `/setup` on the Render service redirects there).

Sign in with the site login, then connect: Twitch (streaming account), Twitch chat bot, YouTube (Google sign-in finds your channel), TikTok (name only - TikTok has no live-chat sign-in), Kick. Pick whether outside chat posts as the bot or as you. Everything is saved to Firebase under your own user; nothing secret is shown on the page.

Twitch and Kick sign-ins go through this service (`POST /connect/twitch|kick` with the site sign-in token) because they need the app secret; the callback saves the login to the user who started it.

The site owner (`OWNER_KEY` in setup.html) also gets an **App keys** box for the Twitch/Kick client ID + secret.

Kick chat uses Kick's official chat events: set the webhook URL `https://ww-stream-sync.onrender.com/webhooks/kick` on the Kick app (kick.com/settings/developer) and turn webhooks on. Each streamer is subscribed when they connect Kick.

## Settings: `users/{emailKey}/stream_sync`

Written with starter values for the app owner on first run (`seed-owner.json`). Any site user can have their own.

| Key | Meaning |
|---|---|
| `enabled` | `true` to turn it on |
| `twitch_login` | your Twitch channel |
| `bot_login` | chat bot account (optional; without it chat is posted as you) |
| `kick_login` | Kick account (optional) |
| `squad` | `{ "<PSN online ID>": "<Twitch login>" }` - tagged when they're in the same game |
| `base_tags` | tags set every stream (max 10, letters/numbers only) |
| `game_tags` | `{ "<game name>": ["Tag", ...] }` extra tags for one game |
| `category_overrides` | `{ "<PSN game name>": "<category name>" }` when the automatic match is wrong |
| `psn_online_id` | your PSN name (defaults to `psn_username` from Settings) |
| `psn_poll_minutes` | minutes between live PSN checks while live (default 5, `0` = database only) |
| `update_title` | `false` to leave the Twitch title alone |
| `youtube_mode` | `same` (same title as Twitch), `base_plus_status` (`youtube_base | status`), or `off` |
| `discord_live_alert` | `false` to skip the Discord alert |
| `chat.youtube_channel_id`, `chat.tiktok_username` | chats to relay into Twitch (set by the setup page) |
| `source` | `auto` (default: PlayStation when in a game there, otherwise copy the Twitch title + category to YouTube/Kick), `twitch` (always copy Twitch - PC/OBS streamers), `playstation` |
| `title_format`, `mention_squad` | title shows `status` / `game_status` / `game`; add @friends in the same game |
| `chat.post_as` | `bot` (default) or `streamer` - who relayed chat is posted as |
| `kick_login`, `kick_user_id` | set when Kick is connected |

Firebase keys can't contain `.` `#` `$` `[` `]` `/` - leave those characters out of game names in `game_tags` / `category_overrides` (matching ignores punctuation).

## Secrets: `user_secrets/{emailKey}`

| Key | Who | How it gets there |
|---|---|---|
| `twitch_client_id`, `twitch_client_secret` | app owner | App keys box on the setup page (from dev.twitch.tv) |
| `kick_client_id`, `kick_client_secret` | app owner (optional) | App keys box on the setup page (from kick.com/settings/developer) |
| `twitch_broadcaster_refresh`, `twitch_bot_refresh`, `kick_refresh` | each streamer | saved by the setup page sign-ins |
| `psn_npsso` | each streamer (optional) | already saved from Settings; without it the PlayStation database is used |
| `discord_webhook` | each streamer (optional) | paste a Discord channel webhook URL |
| `youtube_hook_url`, `youtube_hook_secret` | each streamer (optional) | printed by `setupStreamHook()` in StreamHook.gs |

## Render

Env vars: `FIREBASE_SERVICE_ACCOUNT` (service-account JSON for **entertainment-71888**, same as ww-discord-auth - needed to read your locked secrets and save sign-ins while nobody is on the page), `STREAM_SYNC_APP_OWNER_KEY`, `PUBLIC_URL`, `STATE_SECRET`, optional `SETUP_PAGE_URL`.

Pages: `/setup` (redirects to the site page), `/status` (last pass, JSON), `/wake`, `/health`, `POST /webhooks/kick`.

Twitch redirect URL: `https://ww-stream-sync.onrender.com/auth/twitch/callback`
Kick redirect URL: `https://ww-stream-sync.onrender.com/auth/kick/callback`

Tests: `npm test`.
