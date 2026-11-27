# Werewolf Twitch extension (front end)

Pages Twitch hosts for the extension. All data comes from `ww-stream-sync` (see `server/stream-sync/README.md`):
the server pushes each channel's card through Twitch, so viewers never call Firebase or Render (except "View more",
which reads the streamer's public tracker from Firestore when tapped).

| File | What |
|---|---|
| `video_overlay.html` | desktop overlay (small 🐺 button on the right opens the panel) |
| `mobile.html` | Twitch app view (stacked, full width) |
| `config.html` + `ext-config.js` | broadcaster setup page: registers the channel, shows the pair code |
| `ext-render.js` | card → HTML (tested in `server/stream-sync/test/ext-render.test.js`) |
| `ext.js`, `ext.css`, `ext-ga.js` | viewer wiring, styles, Google Analytics |

Twitch doesn't allow inline scripts in extensions, so every script is its own file.

## Kevin's setup steps (once)

1. **dev.twitch.tv → Your Console → Extensions → Create Extension**, name it "Werewolf Overlay" (2FA must be on).
2. **Extension types:** Video - Fullscreen (overlay) and Mobile. **Video Overlay viewer path:** `video_overlay.html`,
   **Mobile viewer path:** `mobile.html`, **Config path:** `config.html`.
3. **Capabilities:** Configuration service = *Extension Configuration Service* (broadcaster segment), and add these to
   **Allowlist for URL Fetching Domains:** `https://ww-stream-sync.onrender.com`, `https://firestore.googleapis.com`,
   `https://www.google-analytics.com`, `https://www.googletagmanager.com`; **Allowlist for Image Domains:**
   `https://static-cdn.jtvnw.net`, `https://image.api.playstation.com`, `https://psnobj.prod.dl.playstation.net`.
4. **Extension Settings → Client ID + Secret:** paste them into the Keys sheet rows `twitch_ext_client_id` and
   `twitch_ext_secret` (the secret exactly as Twitch shows it). Your Twitch user ID goes in `twitch_ext_owner_id`.
5. Run `bash scripts/build-extension-zip.sh`, upload `dist/werewolf-extension.zip` under **Files → Assets for Hosted Test**.
6. **Access → Testing accounts:** werewolf3788, terrdog420, raymystyro, Phoenix_Darkfire. Move to **Hosted Test**,
   install it on your channel (Creator Dashboard → Extensions), open its settings page to get your pair code,
   pair it in Overlay Studio.
7. When it looks right: **Submit for review**.
