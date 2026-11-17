# ww-stream-sync

Render service that keeps the stream info in step with what you're playing on PlayStation.

While you're **live on Twitch** it checks every 30 seconds and:

| What | Where |
|---|---|
| Fixes the category to the PlayStation game (no more "Games + Demos") | Twitch, Kick |
| Title = PlayStation game status (or game name) + `w/ @friend` for squad members in the same game | Twitch, YouTube, Kick |
| Sets your tags (`base_tags`, plus `game_tags` for the current game) once per stream | Twitch |
| Posts one "now live" alert | Discord webhook |
| Relays YouTube and TikTok chat into Twitch chat as the bot | Twitch |

PlayStation limits how often its API can be called, so the live PSN check is rationed: once when the stream starts, then at most once every `psn_poll_minutes` (default 5), only while live, using your own NPSSO. In between (and if PSN says "too many requests") it reuses the last answer or reads the PlayStation database that the 21-minute GitHub sync writes. Set `psn_poll_minutes` to `0` to never call PSN from here and use only the database.

Render's free plan sleeps after ~15 minutes without visits. The Apps Script **StreamHook** (`Claude-Test/apps-script/StreamHook.gs`) visits `/wake` every minute while you're live, so the service runs only during streams.

A title you change by hand stays until the game status or squad changes. The category is always put back to the right game.

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
| `chat.youtube_channel_id`, `chat.tiktok_username` | chats to relay into Twitch |

Firebase keys can't contain `.` `#` `$` `[` `]` `/` - leave those characters out of game names in `game_tags` / `category_overrides` (matching ignores punctuation).

## Secrets: `user_secrets/{emailKey}`

| Key | Who | How it gets there |
|---|---|---|
| `twitch_client_id`, `twitch_client_secret` | app owner | paste from dev.twitch.tv |
| `kick_client_id`, `kick_client_secret` | app owner (optional) | paste from kick.com/settings/developer |
| `twitch_broadcaster_refresh`, `twitch_bot_refresh`, `kick_refresh` | each streamer | saved by `/setup` |
| `psn_npsso` | each streamer | already saved from Settings |
| `discord_webhook` | each streamer (optional) | paste a Discord channel webhook URL |
| `youtube_hook_url`, `youtube_hook_secret` | each streamer (optional) | printed by `setupStreamHook()` in StreamHook.gs |

## Render

Env vars: `FIREBASE_SERVICE_ACCOUNT` (same JSON as ww-discord-auth), `STREAM_SYNC_APP_OWNER_KEY`, `PUBLIC_URL`, `STATE_SECRET`.

Pages: `/setup` (connect accounts), `/status` (last pass, JSON), `/wake`, `/health`.

Twitch redirect URL: `https://ww-stream-sync.onrender.com/auth/twitch/callback`
Kick redirect URL: `https://ww-stream-sync.onrender.com/auth/kick/callback`

Tests: `npm test`.
