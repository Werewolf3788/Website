# Werewolf Twitch Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Twitch extension (desktop overlay + mobile) that shows each paired streamer's game, status, profile picture, tracker and same-game allies, sold in tiers that also cover Overlay Studio, without viewer traffic touching Firebase or Render.

**Architecture:** `ww-stream-sync` builds one small "card" per live paired channel and pushes it to viewers through Twitch Extension PubSub (and Twitch's broadcaster config segment for first load). `ww-discord-auth` sells and stores tier passes (Buy Me a Coffee claims, `overlay_pro/{account}`). The extension front end in `overlay/extension/` only renders cards; "View more" is the one Firestore read, on tap.

**Tech Stack:** Node 20 + Express (both Render services), firebase-admin, `node:test`; plain HTML/CSS/JS for the extension and Overlay Studio; Twitch Helix + EventSub webhooks; Buy Me a Coffee webhook (already built in `server/discord-auth/bmc.js`).

**Spec:** `docs/superpowers/specs/2026-11-26-twitch-extension-design.md`

## Global Constraints

- All work on branch `Claude-Test`; never a `Claude-Test` folder. Merge to `main` only when Kevin says (BMC items + Twitch console must exist first).
- Prices (locked for life, one price for everyone): Tier 1 $5/mo $50/yr · Tier 2 $10/mo $100/yr · Tier 3 $20/mo $200/yr. Full lifetime $125 / $250 / $500. Founder lifetime $99 / $199 / $399, first **25** buyers total, requires agreeing to a once-a-month credit.
- Month = 31 days, year = 365 days, lifetime = "lifetime of the service" (store `until: 0, lifetime: true`).
- Allies (Kevin's site friends list `users/{owner}/friends`, plus the owner) are Tier 3 for free.
- Existing `overlay_pro` passes (no `tier` field) count as Tier 1.
- Keys come from the Key Vault only: `user_secrets/{owner}/twitch_ext_client_id`, `twitch_ext_secret` (base64), `twitch_ext_owner_id` (Kevin's Twitch user id); env vars of the same name upper-cased override. Missing key → add a row to the Keys sheet, never ask Kevin to paste elsewhere.
- Bulky data in Firestore, never new RTDB top-level folders. New Firestore collections: `ext_channels`, `ext_meta`.
- Watermark: Kevin's current Twitch picture + `werewolf3788`, opacity **0.75**, for **10 s** after a **random 20–40 min of live time** since the last one (live time carries over between streams; stored per channel as `wmLiveSec` / `wmTargetSec`), only while Twitch `viewer_count ≥ 2`, never offline; the server sets `card.wmAt` (epoch ms) so all viewers show it together, random spot in the edge band (outer 18% of width/height), never the centre, never the bottom 12% (player controls); tap opens `https://entertainment-71888.web.app/`. No current game, no Buy Me a Coffee, no QR code in the extension.
- Founder lifetime: the same credit once, at **≥ 5:00 of uptime with viewer_count ≥ 2**, on the first stream ≥ 30 days after the last one (calendar-based, no pile-up).
- Card JSON ≤ 5 KB (Twitch PubSub / config segment limit). Push only on change, heartbeat every 10 min, never more than 1 push/channel/minute.
- GA tags `G-Z9M5LXQ5XN` and `G-CTYHDF4MSD` on every new page (extension pages included; no personal data in events).
- Footer line in the extension: `Track your own games at entertainment-71888.web.app`.

## Review Focus

1. **A streamer installs but never pairs** → extension still shows Twitch basics + watermark after the broadcaster opens the config page once (Task 5 test `register without pairing gives twitch-only card`).
2. **Pass expires mid-stream** → next build drops back to the right tier/watermark, no crash (Task 3 test `expired tier falls back`).
3. **Card grows past 5 KB** (long titles, 6 Stream Together allies) → trimmed, never rejected by Twitch (Task 3 test `card stays under 5KB`).
4. **Founder slots run out between claim and payment** → buyer who already has a claim still gets Founder; new claims after 25 are refused (Task 1 test `founder limit counts paid and open claims`).
5. **Twitch / PSN API down** → last good card kept, nothing pushed, loop keeps running (Task 5 test `api failure keeps last card`).

---

### Task 1: Tier passes in ww-discord-auth

**Files:**
- Create: `server/discord-auth/tiers.js`
- Modify: `server/discord-auth/overlay-pro.js` (PRICES → tiers, `quote`, `grantPass`, `/overlay/pro`, `/overlay/plans`)
- Modify: `server/discord-auth/bmc.js` (overlay claim carries `tier`, `term`, Founder agreement)
- Test: `server/discord-auth/test/tiers.test.js` (create `test/` + `"test": "node --test test/*.test.js"` in package.json)

**Interfaces:**
- Produces: `TIERS = {1:{month:'5.00',year:'50.00',lifetime:'125.00',founder:'99.00'},2:{…'10.00','100.00','250.00','199.00'},3:{…'20.00','200.00','500.00','399.00'}}`, `FOUNDER_LIMIT = 25`, `TERMS_VERSION = '2026-11-26'`.
- Produces: `effectiveTier(doc, now, ally) -> { tier: 0|1|2|3, lifetime: bool, founder: bool, until: number }` — highest tier whose `tiers[t].until > now` or `tiers[t].lifetime`; legacy doc with `until` and no `tiers` → tier 1; `ally` → 3.
- Produces: `priceFor(tier, term, doc) -> string` — lifetime/founder upgrade = target price − lifetime amount already paid (`doc.lifetimePaid`), floor 0.
- Produces (overlay-pro): `quote(platform, channel, tier, term)` → `{ id, label, tier, term, days, name, price }`; `grantPass(ch, tier, term, ref, payer, agreement) -> until` writing `overlay_pro/{ch}.tiers.{tier} = { until | lifetime:true, founder }`, `lifetimePaid`, `agreement`.
- `/overlay/pro/:channel` response adds `tier`, `lifetime`, `founder`; keeps `pro` (= tier ≥ 1) and `games` for old overlays.

- [ ] **Step 1: Write failing tests** `effectiveTier picks highest live tier`, `legacy pass is tier 1`, `ally is tier 3`, `expired tier falls back` (tier 3 expired + tier 1 live → 1), `lifetime upgrade pays the difference` (`priceFor(3,'lifetime',{lifetimePaid:'125.00'})==='375.00'`), `founder limit counts paid and open claims` (25 → claim refused with 409, holder of an existing open Founder claim still granted).
- [ ] **Step 2: Run** `cd server/discord-auth && npm test` → FAIL (module missing).
- [ ] **Step 3: Implement `tiers.js`, wire `overlay-pro.js` and `bmc.js`.** Founder claim requires body `agree=1`; store `{ agreement: { terms: TERMS_VERSION, at } }` on the claim and the pass. Founder count = Firestore transaction on `ext_meta/founders { taken }` incremented at claim time, decremented when a Founder claim expires unpaid (check on read). Remove `earner` pricing.
- [ ] **Step 4: Run** `npm test` and `node /tmp/bmctest/test.js`-style webhook test (copy into `test/bmc.test.js`) → PASS.
- [ ] **Step 5: Commit** `feat(passes): tiers 1-3, lifetime and founder passes`.

### Task 2: Overlay Studio pricing + terms page

**Files:**
- Modify: `overlay-studio.html` (Pro box + Pay or renew modal)
- Create: `overlay-terms.html` (short terms; GA tags; site shell)

**Interfaces:**
- Consumes: `GET /overlay/plans?channel&platform` → `{ tiers: TIERS, founderLeft, current: {tier, lifetime, until} }` (add to Task 1's route); `POST /bmc/claim` with `kind=overlay&tier&term&agree`.

- [ ] **Step 1: Replace the month/year buttons** with a tier × term picker (Tier 1/2/3; Monthly/Yearly/Lifetime/Founder with "N left"); show the line **"Locked-in price — it never goes up."**; Founder shows checkbox "I agree a small werewolf3788 credit shows once a month (Lifetime terms)" linking to `overlay-terms.html`; Pay button disabled until checked.
- [ ] **Step 2: Upgrade text** — when `current.lifetime`, lifetime prices show "pay $X (difference)".
- [ ] **Step 3: Verify in headless Chrome** (playwright, mocked routes as in the BMC check): pick Tier 3 Founder → button disabled until checkbox → claim POST body contains `tier=3&term=founder&agree=1`; no page errors.
- [ ] **Step 4: Commit** `feat(overlay-studio): tier pricing, lifetime and founder terms`.

### Task 3: Card builder (pure) in ww-stream-sync

**Files:**
- Create: `server/stream-sync/lib/extcard.js`
- Test: `server/stream-sync/test/extcard.test.js`

**Interfaces:**
- Produces: `buildCard(input) -> card` where input = `{ tier, founder, live, twitch:{ login, display, avatar, title, gameName, gameBoxArt }, psn:{ title, status, poster } | null, tracker:{ code, games:[{ id, name, platform, summary:[string] }] } | null, allies:[{ login, display, avatar, title, poster, tracker }], watermark:{ img, name } , showCredit }` and card = `{ v:1, at, me:{…}, allies:[…], wm: null | { img, name, every:1800, secs:10, opacity:0.75 }, credit:bool, foot:"Track your own games at entertainment-71888.web.app" }`.
- Produces: `cardSize(card) -> bytes`, `sameCard(a, b) -> bool` (ignores `at`).

- [ ] **Step 1: Write failing tests:** `psn first then twitch` (tier 3 with psn → poster/status from psn; tier 2 with psn input → psn ignored); `twitch fallback uses box art and stream title`; `non-game category uses avatar` (`gameName` "Just Chatting"); `offline shows avatar and tracker`; `tier gating` (tier 0/1 → no tracker, no allies; tier 2 → tracker, Stream Together allies only; tier 3 → + same-title allies); `free tier has watermark, paid has none`; `founder gets credit only when showCredit`; `card stays under 5KB` (6 allies × 300-char titles → ≤ 5120 bytes, allies' tracker dropped before allies are dropped); `sameCard ignores timestamp`.
- [ ] **Step 2: Run** `npm test -- test/extcard.test.js` → FAIL.
- [ ] **Step 3: Implement.** Trim order when over 5 KB: allies' trackers → summaries to 3 lines → titles to 80 chars → allies beyond 3.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `feat(extension): card builder`.

### Task 4: Twitch extension API helper

**Files:**
- Create: `server/stream-sync/lib/extapi.js`
- Test: `server/stream-sync/test/extapi.test.js`

**Interfaces:**
- Produces: `extKeys() -> { clientId, secret(Buffer), ownerId }` (Key Vault via `store.secrets(OWNER)`; throws `"twitch_ext keys missing"`).
- Produces: `signEbs(channelId) -> jwt` (HS256, `exp` now+60s, `role:"external"`, `user_id: ownerId`, `channel_id`, `pubsub_perms:{send:["broadcast"]}`).
- Produces: `verifyViewer(jwt) -> payload | null` (HS256 with secret; checks `exp`).
- Produces: `pushCard(channelId, card)` → `POST https://api.twitch.tv/helix/extensions/pubsub` `{ target:["broadcast"], broadcaster_id, is_global_broadcast:false, message: JSON }`; `saveCard(channelId, card)` → `PUT https://api.twitch.tv/helix/extensions/configurations` `{ extension_id, segment:"broadcaster", broadcaster_id, content: JSON, version:"1" }`. Both with `Client-Id` + `Authorization: Bearer <signEbs>`.
- Produces: `sharedChatParticipants(channelId) -> [broadcasterId]` via `GET /helix/shared_chat/session?broadcaster_id=` with the app token (`twitch.appToken` — export it from `lib/twitch.js`).

- [ ] **Step 1: Failing tests** with fake fetch: `signEbs round-trips through verifyViewer`; `verifyViewer rejects bad signature and expired`; `pushCard sends broadcast with ebs jwt`; `saveCard uses broadcaster segment`; `missing keys throws`.
- [ ] **Step 2–4: Run fail → implement (node `crypto` only, no new dependency) → run pass.**
- [ ] **Step 5: Commit** `feat(extension): twitch extension api helper`.

### Task 5: Channel registry, pairing, EventSub and live loop

**Files:**
- Create: `server/stream-sync/lib/extension.js`
- Modify: `server/stream-sync/server.js` (mount routes, start loop), `server/stream-sync/README.md`
- Test: `server/stream-sync/test/extension.test.js`

**Interfaces:**
- Consumes: Task 3 `buildCard/sameCard`, Task 4 helpers, `store.psnCard`, `lib/psn.js` presence (own NPSSO when the paired user has one), Task 1's `effectiveTier` logic (copy the ~10-line function into `extcard.js` as `effectiveTier`; the two services deploy separately).
- Firestore `ext_channels/{channelId}`: `{ login, pairCode, account (overlay_pro id), userKey|null, friendCode|null, psnOnlineId|null, live, lastCard, lastPush, lastCreditAt, subs:[eventsub ids] }`.
- Routes: `POST /ext/register` (Authorization: viewer JWT with `role:"broadcaster"`) → creates/returns `{ pairCode }` (`WOLF-` + 4 digits), subscribes EventSub; `POST /ext/pair` (form: `code`, `idToken?`) → links `userKey`/`friendCode`/`psnOnlineId` from the signed-in site user, `account = twitch:<login>`; `GET /ext/pair/:code` → `{ login, paired }`; `POST /webhooks/twitch-eventsub` (raw body, HMAC `twitch_eventsub_secret` — generated once and saved with `store.saveSecret(OWNER, …)` if missing).
- EventSub types per channel: `stream.online`, `stream.offline`, `channel.update`, `channel.shared_chat.begin|update|end`.
- Loop (every 60 s, only `live` channels): gather inputs → `buildCard` → if `!sameCard(last)` or 10 min since `lastPush` → `pushCard` + `saveCard`. Watermark (free tier): each loop add elapsed live seconds to `wmLiveSec`; when `wmLiveSec ≥ wmTargetSec` and `viewer_count ≥ 2` → set `card.wmAt = now`, reset `wmLiveSec = 0`, new `wmTargetSec = random 1200–2400`. Founder: when `now - lastCreditAt ≥ 30 days`, uptime ≥ 300 s and `viewer_count ≥ 2` → `card.credit = { at: now }`, `lastCreditAt = now`. Same-title allies = the streamer's site friends (`users/{userKey}/friends`) whose PSN title equals the streamer's (case/punctuation-insensitive, `build.normName`). Stream Together allies = `sharedChatParticipants` that have an `ext_channels` doc. Watermark image/name = Twitch user `twitch_ext_owner_id`, cached 24 h.
- Existing `keepAwake` stays awake while any `ext_channels` doc is live.

- [ ] **Step 1: Failing tests** (fake store/twitch/extapi as in `status.test.js`): `register without pairing gives twitch-only card`; `pair links friend code and psn`; `eventsub bad signature 403`, `stream.online marks live and pushes`; `unchanged card not pushed again within 10 min`; `api failure keeps last card` (twitch helper throws → no push, `lastCard` unchanged, loop continues); `founder credit at most once per 30 days`, `founder credit waits for 5 min uptime and 2 viewers`, `watermark waits for 2 viewers`, `watermark live time carries over a restart` (stream ends at 29 min, restarts → shows once 2 viewers are in), `watermark target is 20–40 min`; `same-title friend becomes ally, different title does not`.
- [ ] **Step 2–4: Run fail → implement → `npm test` all pass** (old tests too).
- [ ] **Step 5: Commit** `feat(extension): registry, pairing, eventsub and live loop`.

### Task 6: Extension front end

**Files:**
- Create: `overlay/extension/video_overlay.html`, `mobile.html`, `config.html`, `ext.css`, `ext-render.js` (pure, UMD: works in browser and `require`), `ext.js` (Twitch helper wiring), `README.md` (Kevin's console steps)
- Create: `scripts/build-extension-zip.sh` → `dist/werewolf-extension.zip` (dist/ in .gitignore)
- Test: `server/stream-sync/test/ext-render.test.js` (requires `../../../overlay/extension/ext-render.js`)

**Interfaces:**
- Consumes: card shape from Task 3; `POST /ext/register` from Task 5.
- Produces (`ext-render.js`): `renderCard(card, { mobile }) -> html`, `renderMore(trackerDocs) -> html`, `creditSpot(rand, w, h) -> { x, y }` (edge band only), `escapeHtml`.
- `ext.js`: `Twitch.ext.onAuthorized` → store token; `Twitch.ext.configuration.onChanged` → render `broadcaster.content`; `Twitch.ext.listen('broadcast', …)` → render; "View more" → `fetch` Firestore REST `https://firestore.googleapis.com/v1/projects/entertainment-71888/databases/(default)/documents/user/{CODE}/platform/{p}/game` (on tap only); watermark shown once per distinct `card.wmAt` (if `now - wmAt < 60 s`); credit shown once per distinct `card.credit.at`.
- Desktop overlay starts collapsed as a small button (right edge); left allies panel is a carousel with ◀ ▶ and "1/N".
- `config.html`: calls `/ext/register`, shows the pair code and link `https://entertainment-71888.web.app/overlay-studio#extension`.

- [ ] **Step 1: Failing tests:** `renderCard shows streamer on right and allies carousel`, `renderCard escapes titles` (`<img onerror>` in title → escaped), `no watermark markup when card.wm null`, `creditSpot never centre or bottom 12%` (10 000 random draws), `shows watermark once per wmAt` (export `shouldShowMark(wmAt, now, seenSet) -> bool`), `mobile render stacks`.
- [ ] **Step 2–4: Run fail → implement → pass.**
- [ ] **Step 5: Visual check** with playwright: load `video_overlay.html` with a stub `window.Twitch.ext` that delivers a sample card; screenshot desktop 1280×720 and mobile 380×700; no page errors; watermark opacity 0.75.
- [ ] **Step 6: Commit** `feat(extension): overlay, mobile and config pages`.

### Task 7: Overlay Studio "Twitch extension" output + pairing

**Files:**
- Modify: `overlay-studio.html`

**Interfaces:**
- Consumes: `GET /ext/pair/:code`, `POST /ext/pair` (Task 5, on `https://ww-stream-sync.onrender.com`).

- [ ] **Step 1: Add output choice** "OBS / Streamlabs" | "Twitch extension". In extension mode, features the extension can't do (chat box, sound alerts, any browser-only widget) are greyed with "only works in OBS/Streamlabs".
- [ ] **Step 2: Pair box** (`#extension` anchor): code input → `GET /ext/pair/:code` shows "twitch.tv/<login> — Pair" → `POST /ext/pair` with the site idToken when signed in (unlocks Tier 2/3 data) → "Paired".
- [ ] **Step 3: Verify** in headless Chrome with mocked routes: extension mode greys chat box; pairing flow shows "Paired"; no page errors.
- [ ] **Step 4: Commit** `feat(overlay-studio): twitch extension output and pairing`.

### Task 8: Keys, docs, final check, push

**Files:**
- Modify: `server/discord-auth/README.md`, `server/stream-sync/README.md`
- Keys sheet `1sRVGYN_rHj-L0wptwvTSbLXP4QQGZzvUsVwnEgR9Ekc` tab `Keys`: append rows `Twitch | Werewolf extension | Extension Client ID | | twitch_ext_client_id`, `… Extension Secret (base64) | | twitch_ext_secret`, `… Your Twitch user ID | | twitch_ext_owner_id`.

- [ ] **Step 1: Append the three Keys rows** (Sheets connector) and fill `twitch_ext_owner_id` by looking up `werewolf3788` with the app token if the server can; otherwise leave for Kevin with a note.
- [ ] **Step 2: Run** `cd server/discord-auth && npm test` and `cd server/stream-sync && npm test` → all PASS; `bash scripts/build-extension-zip.sh` → zip lists the 6 front-end files.
- [ ] **Step 3: Push** `Claude-Test`; do **not** merge to `main` (waiting on Kevin's console setup and Buy Me a Coffee items).
- [ ] **Step 4: Commit** `docs(extension): setup steps and keys`.
