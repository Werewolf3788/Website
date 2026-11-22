# Ray's Monopoly Vault

Page: `Ray/monopoly.html` (reads everything from `Ray/monopoly.json`).

## Add a new game
1. Put the box photo in `Ray/images/monopoly/` (`name.webp` for ~1400px wide, `name-thumb.webp` for ~640px).
2. Add an entry to `games` in `monopoly.json` (copy an existing one). Only `id`, `title`, `category`, `image`, `thumb` are required.
3. Optional fields: `subtitle`, `publisher`, `year`, `condition` (use "Factory Sealed" for the gold badge), `copies`, `notes`, `accent` (glow color), `added` (YYYY-MM-DD), `variants` (several box versions).

## Want list
Add entries to `wishlist`: `{ "title": "...", "note": "...", "category": "Video Games" }`. The "Still Hunting" section appears automatically.
