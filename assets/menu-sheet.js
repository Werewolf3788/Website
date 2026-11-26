/* ============================================================================
   Werewolf Project - site menu from the published Google Sheet ("Website Menu")
   File: assets/menu-sheet.js   (load with a plain <script> before ww-shell.js)

   Columns: A Name | B Group | C Url with UTM | D Images | E Poster Preview (not used) | F Tag
   Builds the same structure the old Firebase /utm_links node had, so every page
   keeps working unchanged:
     - rows whose Group is empty / Home / None / Standalone  -> standalone keys
     - every other Group                                     -> array under that group
     - each item: { title, url, image, tag, group, rowNumber, updatedAt }

   window.wwMenuData()   -> Promise<object>   (the menu, same shape as utm_links)
   window.wwMenuFetch()  -> Promise<Response-like {ok, status, json()}>  (drop-in for fetch(utm_links.json))
   The last good menu is kept on the device, so the bar still shows if Google is slow.
   ========================================================================== */
(function () {
    'use strict';
    if (window.wwMenuData) return;

    const SHEET_CSV = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS7s86dWkDdx-SomMJamUCFEEsQEpgcPBxUFmanAuYrWqqVSfDqOEhgLs1hZfLRFOPK7vLFeXKcMXqK/pub?gid=0&single=true&output=csv';
    const CACHE_KEY = 'ww_menu_sheet_v3';   // v3: link and picture columns are read by what the cells hold

    // ---- CSV parser (handles quotes, commas and line breaks inside cells)
    function parseCsv(text) {
        const rows = []; let row = [], cell = '', q = false;
        for (let i = 0; i < text.length; i++) {
            const c = text[i];
            if (q) {
                if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
                else cell += c;
            } else if (c === '"') q = true;
            else if (c === ',') { row.push(cell); cell = ''; }
            else if (c === '\n' || c === '\r') {
                if (c === '\r' && text[i + 1] === '\n') i++;
                row.push(cell); rows.push(row); row = []; cell = '';
            } else cell += c;
        }
        if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
        return rows;
    }

    // Same key cleaning as the old Apps Script (sanitizeKey)
    /* Links to this site work on every copy of it (GitHub Pages /Website/... or Firebase):
     *   - a path like "/security/setting" is put under the site you are on
     *   - a full link to one of the site's own addresses is switched to the site you are on
     * Links to other sites (ditto.fm, discord.gg, ...) are left alone. */
    const OWN_SITE = /^(?:https?:)?\/\/(?:entertainment-71888\.web\.app|entertainment-71888\.firebaseapp\.com|werewolf3788\.github\.io\/Website)(?=[\/?#]|$)/i;
    function siteRoot() {
        if (/\.github\.io$/i.test(location.hostname)) { const seg = location.pathname.split('/')[1]; return seg ? '/' + seg : ''; }
        return '';                                                     // Firebase / custom domain: site is at the root
    }
    function siteUrl(url) {
        if (!url || location.protocol === 'file:') return url;
        const m = url.match(OWN_SITE);
        if (m) { const rest = url.slice(m[0].length); return siteRoot() + (rest.startsWith('/') ? rest : '/' + rest); }
        if (url.startsWith('/') && !url.startsWith('//')) {
            const root = siteRoot();
            if (!root) return url.replace(/^\/Website(?=[\/?#]|$)/, '') || '/';            // Firebase has no /Website folder
            return url === root || url.startsWith(root + '/') ? url : root + url;          // already has /Website: leave it
        }
        return url;
    }

    const sanitizeKey = (s) => String(s || '').trim().replace(/[.$#\[\]\/]/g, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');

    const looksLikeImage = (v) => /\.(png|jpe?g|webp|gif|avif|svg)(?:[?#]|$)/i.test(v) || /^data:image\//i.test(v);

    function buildMenu(rows) {
        if (!rows.length) return {};
        const head = rows[0].map(h => String(h || '').toLowerCase());
        const body = rows.slice(1);
        const col = (re, fallback) => { const i = head.findIndex(h => re.test(h)); return i >= 0 ? i : fallback; };
        const cName = col(/^name/, 0), cGroup = col(/^group/, 1), cTag = col(/^tag/, 5);
        const cellsAt = (i) => (i >= 0 ? body.map(r => String(r[i] || '').trim()).filter(Boolean) : []);
        const pictureShare = (i) => { const c = cellsAt(i); return c.length ? c.filter(looksLikeImage).length / c.length : 0; };

        /* The sheet has more than one "Url with UTM" column and one of them holds the
         * poster pictures, so the link column and the picture column are chosen by what
         * the cells look like rather than by their position. Reading them by position
         * once pointed the links at the pictures: a menu item opened a poster instead of
         * the page. */
        const linkColumns = head.map((h, i) => i).filter(i => /^url|link|href/.test(head[i]));
        const cUrl = (linkColumns.length ? linkColumns : [2]).reduce((best, i) => (pictureShare(i) < pictureShare(best) ? i : best));

        let cImg = head.findIndex(h => /image|poster|thumb|photo/.test(h));
        if (cImg < 0 || pictureShare(cImg) === 0) {
            cImg = head.map((h, i) => i)
                .filter(i => i !== cUrl && i !== cName && i !== cGroup)
                .reduce((best, i) => (pictureShare(i) > pictureShare(best) ? i : best), -1);
            if (pictureShare(cImg) === 0) cImg = -1;                          // nothing holds pictures: leave it empty
        }

        const now = new Date().toISOString();
        const out = {};
        body.forEach((r, i) => {
            const rowNumber = i + 2;
            const name = String(r[cName] || '').trim();
            if (!name || name.startsWith('#')) return;                       // blank / commented rows
            const group = String(r[cGroup] || '').trim();
            let image = String(r[cImg] || '').trim();
            let url = String(r[cUrl] || '').trim();
            if (looksLikeImage(url)) {                                       // a poster is never a menu link
                if (!image) image = url;
                url = '';
            }
            if (url.startsWith('#REF') || /ref!/i.test(url)) url = '';         // formula errors
            if (url && !/^(https?:)?\/\//i.test(url) && !url.startsWith('#') && !url.startsWith('.') && !url.startsWith('/')) url = 'https://' + url;
            url = siteUrl(url);
            const item = { title: name, url, image, tag: String(r[cTag] || '').trim(),
                           group: group || 'Standalone', rowNumber, updatedAt: now };
            const g = group.toLowerCase();
            if (!g || g === 'home' || g === 'none' || g === 'standalone') {
                out[sanitizeKey(name) || ('link_' + rowNumber)] = item;
            } else {
                const k = sanitizeKey(group);
                (out[k] = out[k] || []).push(item);
            }
        });
        return out;
    }

    const readCache = () => { try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch (e) { return null; } };
    const writeCache = (data) => { try { localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data })); } catch (e) {} };

    let pending = null;
    window.wwMenuData = function () {
        if (pending) return pending;
        pending = fetch(SHEET_CSV + '&t=' + Math.floor(Date.now() / 60000), { cache: 'no-store' })
            .then(r => { if (!r.ok) throw new Error('menu sheet HTTP ' + r.status); return r.text(); })
            .then(t => {
                const data = buildMenu(parseCsv(t));
                if (!Object.keys(data).length) throw new Error('menu sheet is empty');
                writeCache(data);
                return data;
            })
            .catch(err => {
                console.warn('[menu]', err.message);
                const c = readCache();
                if (c && c.data) return c.data;
                throw err;
            });
        setTimeout(() => { pending = null; }, 60000);   // allow a fresh read after a minute
        return pending;
    };
    window.wwMenuCached = () => (readCache() || {}).data || null;
    window.wwMenuFetch = () => window.wwMenuData()
        .then(data => ({ ok: true, status: 200, json: async () => data }))
        .catch(e => ({ ok: false, status: 503, json: async () => null }));
    window.wwMenuParse = (csvText) => buildMenu(parseCsv(csvText));   // for testing
})();

/* Game pill shortcuts (the pill bar on games/all).
   The RDR2 pill opens the Wheeler, Rawson & Co. shop catalogue instead of the
   collector-role checklist. Add more games here if they get a page of their own.
   games/Universal.js rebuilds the pills, so this listens on the bar itself
   rather than on the individual pills. */
(function () {
    var PILL_LINKS = { rdr2: '/games/rdr2.html' };
    function wire() {
        var bar = document.getElementById('gamePillsContainer');
        if (!bar || bar.getAttribute('data-pill-links') === '1') return;
        bar.setAttribute('data-pill-links', '1');
        bar.addEventListener('click', function (e) {
            var pill = e.target && e.target.closest ? e.target.closest('.game-pill') : null;
            if (!pill) return;
            var dest = PILL_LINKS[String(pill.getAttribute('data-game-key') || '').toLowerCase()];
            if (!dest) return;
            e.preventDefault();
            e.stopPropagation();
            window.location.href = dest;
        }, true);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
    else wire();
})();

/* Game switcher row for the Red Dead Online catalogue (games/rdr2.html).
   That page is a standalone catalogue and has none of the ledger's pill bar, so
   the same games are printed above it, read from the live games catalog in
   Firebase so a newly synced game turns up here without editing the page. */
(function () {
    'use strict';
    if (!/\/games\/rdr2(?:\.html)?\/?$/i.test(location.pathname)) return;

    var CATALOG_URL = 'https://entertainment-71888-default-rtdb.firebaseio.com/platforms/games_catalog.json';
    var CSS = [
        '.game-pills{max-width:1240px;margin:0 auto 14px;display:flex;align-items:center;gap:8px;overflow-x:auto;padding:0 2px 6px;-webkit-overflow-scrolling:touch;scrollbar-width:thin}',
        '.game-pills:empty{display:none}',
        '.game-pill{flex:0 0 auto;display:inline-flex;align-items:center;min-height:44px;padding:8px 16px;border:1px solid #6d5640;border-radius:999px;background:rgba(239,230,208,.94);color:#2a1e14;font-family:"EB Garamond",Georgia,serif;font-size:.95rem;letter-spacing:.02em;text-decoration:none;white-space:nowrap}',
        '.game-pill:hover{background:#f8f1de;border-color:#a1554b}',
        '.game-pill[aria-current="true"]{background:#7d2b23;border-color:#4f1a14;color:#f8f1de;font-weight:600}'
    ].join('\n');

    // Links keep working on the GitHub Pages copy (/Website/...) as well as on Firebase.
    function siteLink(path) {
        if (/\.github\.io$/i.test(location.hostname)) {
            var seg = location.pathname.split('/')[1];
            return (seg ? '/' + seg : '') + path;
        }
        return path;
    }

    function mount() {
        var card = document.querySelector('.catalogue');
        if (!card || document.getElementById('gamePills')) return;

        var style = document.createElement('style');
        style.textContent = CSS;
        document.head.appendChild(style);

        var bar = document.createElement('nav');
        bar.className = 'game-pills';
        bar.id = 'gamePills';
        bar.setAttribute('aria-label', 'Choose a game');
        card.parentNode.insertBefore(bar, card);

        fetch(CATALOG_URL, { cache: 'no-store' })
            .then(function (res) { return res.ok ? res.json() : null; })
            .then(function (catalog) {
                if (!catalog || typeof catalog !== 'object') return;
                Object.keys(catalog).sort().forEach(function (key) {
                    var data = catalog[key] || {};
                    var here = key.toLowerCase() === 'rdr2';
                    var pill = document.createElement('a');
                    pill.className = 'game-pill';
                    pill.setAttribute('data-game-key', key);
                    pill.href = here ? siteLink('/games/rdr2') : siteLink('/games/all?game=' + encodeURIComponent(key));
                    if (here) pill.setAttribute('aria-current', 'true');
                    pill.textContent = String(data.title || data.game || key.toUpperCase());
                    bar.appendChild(pill);
                });
            })
            .catch(function () { /* the catalogue still works without the switcher */ });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
    else mount();
})();

/* Weather-matched backdrop for the Red Dead Online catalogue. The sky behind
   the page follows the live weather at the real-world town behind a frontier
   location, the way the "Real Weather and Real Time Sync" mod drives the game.
   Kept in its own file so no other page pays for it. */
(function () {
    'use strict';
    if (!/\/games\/rdr2(?:\.html)?\/?$/i.test(location.pathname)) return;
    if (document.getElementById('wwRdr2Weather')) return;

    var path = '/assets/rdr2-weather.js';
    if (/\.github\.io$/i.test(location.hostname)) {
        var seg = location.pathname.split('/')[1];
        if (seg) path = '/' + seg + path;
    }

    var script = document.createElement('script');
    script.id = 'wwRdr2Weather';
    script.src = path;
    script.defer = true;
    document.head.appendChild(script);
})();
