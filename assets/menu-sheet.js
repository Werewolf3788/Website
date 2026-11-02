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
    const CACHE_KEY = 'ww_menu_sheet_v1';

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
    const sanitizeKey = (s) => String(s || '').trim().replace(/[.$#\[\]\/]/g, '')
        .replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');

    function buildMenu(rows) {
        if (!rows.length) return {};
        const head = rows[0].map(h => String(h || '').toLowerCase());
        const col = (re, fallback) => { const i = head.findIndex(h => re.test(h)); return i >= 0 ? i : fallback; };
        const cName = col(/^name/, 0), cGroup = col(/^group/, 1), cUrl = col(/url/, 2),
              cImg = col(/^image/, 3), cTag = col(/^tag/, 5);
        const now = new Date().toISOString();
        const out = {};
        rows.slice(1).forEach((r, i) => {
            const rowNumber = i + 2;
            const name = String(r[cName] || '').trim();
            if (!name || name.startsWith('#')) return;                       // blank / commented rows
            const group = String(r[cGroup] || '').trim();
            let url = String(r[cUrl] || '').trim();
            if (url.startsWith('#REF') || /ref!/i.test(url)) url = '';         // formula errors
            if (url && !/^(https?:)?\/\//i.test(url) && !url.startsWith('#') && !url.startsWith('.') && !url.startsWith('/')) url = 'https://' + url;
            const item = { title: name, url, image: String(r[cImg] || '').trim(), tag: String(r[cTag] || '').trim(),
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
