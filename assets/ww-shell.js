/* ============================================================================
   Werewolf Project - shared app shell
   File: assets/ww-shell.js   (include on every page with <script defer>)

   What it does on every page:
     1. Site menu from Firebase /utm_links (cached on the device for 6 hours,
        so pages don't re-download it on every visit)
          - wide desktop:            top menu with dropdown folders
          - narrow desktop / tablet: sandwich button + slide-in drawer
          - phones / touch portrait: app-style bottom navigation
     2. Installable app (PWA): manifest + service worker (sw.js)
     3. Push notifications (Web Push). Subscriptions are saved to
        Firebase /push_subscriptions and sent by .github/workflows/send-push.yml

   Page hooks (optional):
     <div data-ww-nav-slot></div>      put the menu inside the page's own header
     data-ww-legacy-nav                 on the page's old menu, hidden by the shell
     <html data-ww-no-shell>            skip the shell on this page (e.g. OBS overlays)
   ========================================================================== */
(function () {
    'use strict';
    if (window.__wwShell) return;
    window.__wwShell = true;
    const root = document.documentElement;
    if (root.hasAttribute('data-ww-no-shell')) return;

    // ---------------------------------------------------------------- config
    const RTDB = 'https://entertainment-71888-default-rtdb.firebaseio.com';
    const MENU_CACHE_KEY = 'ww_menu_cache_v1';
    const MENU_MAX_AGE_MS = 6 * 60 * 60 * 1000;
    // Public half of the Web Push key pair. The private half is the
    // VAPID_PRIVATE_KEY GitHub secret used by .github/workflows/send-push.yml
    const VAPID_PUBLIC_KEY = 'BImzeWS4nMqlBy1hSI2wO2h01QrcgFDTLgeIZgLlL2wLhuQjZv3hjiOH00NNfveG662KozG6s87gtfByPS7zgqA';
    const BOTTOM_NAV_QUERY = '(max-width: 767px), (pointer: coarse) and (orientation: portrait) and (max-width: 1100px), (pointer: coarse) and (max-height: 500px)';
    const BURGER_QUERY = '(max-width: 1100px)';

    // Site root, worked out from where this script was loaded (works on
    // entertainment-71888.web.app/ and werewolf3788.github.io/Website/ alike)
    const SCRIPT_SRC = (document.currentScript && document.currentScript.src) || '';
    const SITE_ROOT = SCRIPT_SRC ? new URL('../', SCRIPT_SRC).href : new URL('/', location.href).href;
    const rootUrl = (p) => new URL(p, SITE_ROOT).href;

    root.classList.add('ww-shell-on');

    // ------------------------------------------------------------- helpers
    const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const secure = (u) => (typeof u === 'string' && u.startsWith('http://')) ? 'https://' + u.slice(7) : u;
    const ICONS = {
        home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h5v-6h4v6h5V10"/>',
        user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/>',
        game: '<rect x="2" y="7" width="20" height="11" rx="5"/><path d="M7 11v3M5.5 12.5h3"/><circle cx="16" cy="11.5" r="1"/><circle cx="18" cy="14" r="1"/>',
        film: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/>',
        music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
        album: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/>',
        settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
        heart: '<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/>',
        cart: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/>',
        folder: '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
        link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
        more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
        bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
        install: '<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/>',
        burger: '<path d="M4 6h16M4 12h16M4 18h16"/>'
    };
    const icon = (name, cls) => `<svg class="${cls || 'ww-ico'}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.link}</svg>`;
    function iconFor(title) {
        const t = String(title || '').toLowerCase();
        if (/home/.test(t)) return 'home';
        if (/user|profile|member|squad|player/.test(t)) return 'user';
        if (/game|trophy|play|steam/.test(t)) return 'game';
        if (/movie|cinema|film|tv|watch|entertain/.test(t)) return 'film';
        if (/music|song|dj|album/.test(t)) return /album/.test(t) ? 'album' : 'music';
        if (/setting|privacy|security/.test(t)) return 'settings';
        if (/donat|tip|support/.test(t)) return 'heart';
        if (/amazon|deal|shop|store/.test(t)) return 'cart';
        return 'folder';
    }
    function toast(msg, ms) {
        let el = document.getElementById('ww-toast');
        if (!el) { el = document.createElement('div'); el.id = 'ww-toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
        el.textContent = msg;
        el.classList.add('is-on');
        clearTimeout(el._t);
        el._t = setTimeout(() => el.classList.remove('is-on'), ms || 3500);
    }
    function isCurrent(url) {
        try {
            const u = new URL(url, location.href);
            if (u.origin !== location.origin) return false;
            const clean = (p) => p.replace(/\/index\.html$/, '/').replace(/\.html$/, '').replace(/\/$/, '') || '/';
            return clean(u.pathname) === clean(location.pathname);
        } catch (e) { return false; }
    }

    // ------------------------------------------------------- head additions
    function ensureHead() {
        const head = document.head;
        const add = (tag, attrs) => { const el = document.createElement(tag); Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v)); head.appendChild(el); };
        if (!head.querySelector('meta[name="viewport"]')) add('meta', { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' });
        if (!head.querySelector('link[rel="manifest"]')) add('link', { rel: 'manifest', href: rootUrl('manifest.json') });
        if (!head.querySelector('meta[name="theme-color"]')) add('meta', { name: 'theme-color', content: '#0f172a' });
        if (!head.querySelector('link[rel="apple-touch-icon"]')) add('link', { rel: 'apple-touch-icon', href: rootUrl('icons/apple-touch-icon.png') });
        if (!head.querySelector('meta[name="apple-mobile-web-app-capable"]')) add('meta', { name: 'apple-mobile-web-app-capable', content: 'yes' });
        if (!head.querySelector('meta[name="mobile-web-app-capable"]')) add('meta', { name: 'mobile-web-app-capable', content: 'yes' });
        if (!head.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')) add('meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' });
        if (!head.querySelector('link[href$="ww-shell.css"]')) add('link', { rel: 'stylesheet', href: rootUrl('assets/ww-shell.css') });
    }

    // ------------------------------------------------------------ menu data
    function parseMenu(data) {
        const items = [];
        (function walk(node) {
            if (!node || typeof node !== 'object') return;
            const url = node.url || node.link || node.href;
            if (url && typeof url === 'string') {
                items.push({
                    title: String(node.title || node.name || 'Link').trim(),
                    url: secure(url.trim()),
                    image: secure(node.image || node.thumb || '') || '',
                    group: node.group ? String(node.group).trim() : 'Standalone',
                    row: Number(node.rowNumber || 999)
                });
                return;
            }
            Object.values(node).forEach(walk);
        })(data);

        const groups = {};
        const standalone = [];
        items.forEach(it => {
            if (!it.group || /^standalone$/i.test(it.group)) standalone.push(it);
            else (groups[it.group] = groups[it.group] || []).push(it);
        });
        const entries = [
            ...Object.entries(groups).map(([title, list]) => {
                list.sort((a, b) => a.row - b.row);
                return { title, isGroup: true, items: list, row: Math.min(...list.map(i => i.row)) };
            }),
            ...standalone.map(it => ({ ...it, isGroup: false }))
        ];
        entries.sort((a, b) => a.row - b.row);
        return entries;
    }

    function readCache() {
        try { const c = JSON.parse(localStorage.getItem(MENU_CACHE_KEY) || 'null'); return c && Array.isArray(c.menu) ? c : null; } catch (e) { return null; }
    }
    function writeCache(menu) {
        try { localStorage.setItem(MENU_CACHE_KEY, JSON.stringify({ at: Date.now(), menu })); } catch (e) { /* private mode */ }
    }
    async function fetchMenu() {
        const res = await fetch(`${RTDB}/utm_links.json`, { cache: 'no-store' });
        if (!res.ok) throw new Error('menu HTTP ' + res.status);
        const menu = parseMenu(await res.json());
        if (menu.length) writeCache(menu);
        return menu;
    }

    // -------------------------------------------------------------- render
    let MENU = [];
    const linkTarget = (url) => {
        try { const u = new URL(url, location.href); return u.origin !== location.origin ? ' target="_blank" rel="noopener noreferrer"' : ''; } catch (e) { return ''; }
    };
    const thumb = (it) => it.image ? `<img class="ww-thumb" src="${esc(it.image)}" alt="" loading="lazy" onerror="this.remove()">` : icon(iconFor(it.title));

    function homeEntry() {
        for (const e of MENU) {
            if (!e.isGroup && /^home$/i.test(e.title)) return e;
            if (e.isGroup) { const h = e.items.find(i => /^home$/i.test(i.title)); if (h) return h; }
        }
        return { title: 'Home', url: rootUrl('index.html'), image: '' };
    }

    function desktopMenuHtml() {
        const li = MENU.map((e, i) => {
            if (!e.isGroup) {
                return `<li><a class="ww-link${isCurrent(e.url) ? ' is-active' : ''}" href="${esc(e.url)}"${linkTarget(e.url)}>${thumb(e)}<span>${esc(e.title)}</span></a></li>`;
            }
            return `<li data-ww-dd>
                <button type="button" class="ww-link" aria-expanded="false" aria-controls="ww-dd-${i}">${icon(iconFor(e.title))}<span>${esc(e.title)}</span><span class="ww-caret">▾</span></button>
                <ul class="ww-dropdown" id="ww-dd-${i}">${e.items.map(it => `<li><a href="${esc(it.url)}"${linkTarget(it.url)}${isCurrent(it.url) ? ' aria-current="page"' : ''}>${thumb(it)}<span>${esc(it.title)}</span></a></li>`).join('')}</ul>
            </li>`;
        }).join('');
        return `<nav class="ww-menu" aria-label="Site menu">
            <ul class="ww-menu-links">${li || '<li><span class="ww-link" style="opacity:.6">Loading…</span></li>'}</ul>
            <button type="button" class="ww-burger" data-ww-open-drawer aria-label="Open menu" aria-controls="ww-drawer" aria-expanded="false">${icon('burger', '')}<span>Menu</span></button>
        </nav>`;
    }

    function listHtml(entries, openCurrent) {
        return `<ul class="ww-list">${entries.map(e => {
            if (!e.isGroup) return `<li><a href="${esc(e.url)}"${linkTarget(e.url)} class="${isCurrent(e.url) ? 'is-active' : ''}">${thumb(e)}<span>${esc(e.title)}</span></a></li>`;
            const open = openCurrent && e.items.some(it => isCurrent(it.url));
            return `<li><details class="ww-group"${open ? ' open' : ''}><summary>${icon(iconFor(e.title))}<span>${esc(e.title)}</span></summary>
                <ul class="ww-list">${e.items.map(it => `<li><a href="${esc(it.url)}"${linkTarget(it.url)} class="${isCurrent(it.url) ? 'is-active' : ''}">${thumb(it)}<span>${esc(it.title)}</span></a></li>`).join('')}</ul></details></li>`;
        }).join('')}</ul>`;
    }

    function appActionsHtml() {
        return `<div class="ww-section-title">App</div>
        <ul class="ww-list">
            <li><button type="button" class="ww-row" data-ww-install hidden>${icon('install')}<span>Install app</span><span class="ww-row-detail">Add to home screen</span></button></li>
            <li><button type="button" class="ww-row" data-ww-push>${icon('bell')}<span>Notifications</span><span class="ww-row-detail" data-ww-push-state>…</span></button></li>
        </ul>`;
    }

    function ensureShellDom() {
        // Top bar only on pages that don't give the shell a spot in their own header
        if (!document.querySelector('[data-ww-nav-slot]') && !document.getElementById('ww-topbar')) {
            const bar = document.createElement('header');
            bar.id = 'ww-topbar';
            bar.innerHTML = `<a class="ww-brand" href="${esc(rootUrl('index.html'))}"><img src="${esc(rootUrl('icons/icon-192.png'))}" alt=""><span>WEREWOLF<b>PROJECT</b></span></a><div class="ww-nav-slot" data-ww-nav-slot></div>`;
            document.body.insertBefore(bar, document.body.firstChild);
        }
        if (!document.getElementById('ww-drawer')) {
            const bd = document.createElement('div'); bd.id = 'ww-drawer-backdrop'; document.body.appendChild(bd);
            const dr = document.createElement('aside'); dr.id = 'ww-drawer'; dr.setAttribute('aria-label', 'Site menu'); dr.setAttribute('aria-hidden', 'true'); document.body.appendChild(dr);
            const nav = document.createElement('nav'); nav.id = 'ww-bottom-nav'; nav.setAttribute('aria-label', 'Site navigation'); document.body.appendChild(nav);
            const sb = document.createElement('div'); sb.id = 'ww-sheet-backdrop'; document.body.appendChild(sb);
            bd.addEventListener('click', closeDrawer);
            sb.addEventListener('click', closeSheets);
        }
    }

    // Bottom nav: Home + first three folders + More
    function bottomGroups() {
        const groups = MENU.filter(e => e.isGroup && !/^home$/i.test(e.title));
        const main = groups.slice(0, 3);
        const rest = MENU.filter(e => !main.includes(e) && !(!e.isGroup && /^home$/i.test(e.title)));
        // a "Home" folder's other links go into More
        const homeGroup = MENU.find(e => e.isGroup && /^home$/i.test(e.title));
        if (homeGroup) rest.splice(rest.indexOf(homeGroup), 1, ...homeGroup.items.filter(i => !/^home$/i.test(i.title)).map(i => ({ ...i, isGroup: false })));
        return { main, rest };
    }

    function render() {
        ensureShellDom();
        document.querySelectorAll('[data-ww-nav-slot]').forEach(slot => { slot.innerHTML = desktopMenuHtml(); });

        document.getElementById('ww-drawer').innerHTML = `
            <div class="ww-drawer-head"><strong>Menu</strong><button type="button" class="ww-close" data-ww-close-drawer aria-label="Close menu">✕</button></div>
            ${listHtml(MENU, true)}
            ${appActionsHtml()}`;

        const { main, rest } = bottomGroups();
        const home = homeEntry();
        document.getElementById('ww-bottom-nav').innerHTML = `
            <a class="ww-bn-btn${isCurrent(home.url) ? ' is-active' : ''}" href="${esc(home.url)}">${icon('home')}<span>Home</span></a>
            ${main.map((g, i) => {
                const active = g.items.some(it => isCurrent(it.url));
                return `<button type="button" class="ww-bn-btn${active ? ' is-active' : ''}" data-ww-sheet="g${i}" aria-expanded="false" aria-controls="ww-sheet-g${i}">${icon(iconFor(g.title))}<span>${esc(g.title)}</span></button>`;
            }).join('')}
            <button type="button" class="ww-bn-btn" data-ww-sheet="more" aria-expanded="false" aria-controls="ww-sheet-more">${icon('more')}<span>More</span></button>`;

        document.querySelectorAll('.ww-sheet').forEach(s => s.remove());
        const addSheet = (id, title, html) => {
            const s = document.createElement('div');
            s.className = 'ww-sheet'; s.id = `ww-sheet-${id}`; s.setAttribute('role', 'dialog'); s.setAttribute('aria-label', title);
            s.innerHTML = `<div class="ww-sheet-title">${esc(title)}</div>${html}`;
            document.body.appendChild(s);
        };
        main.forEach((g, i) => addSheet(`g${i}`, g.title, listHtml(g.items.map(it => ({ ...it, isGroup: false })), false)));
        addSheet('more', 'More', listHtml(rest, true) + appActionsHtml());

        applyMode();
        refreshInstallButtons();
        refreshPushState();
    }

    // ------------------------------------------------------- interactions
    function closeDropdowns(except) {
        document.querySelectorAll('[data-ww-dd].is-open').forEach(li => {
            if (li === except) return;
            li.classList.remove('is-open');
            li.querySelector('button').setAttribute('aria-expanded', 'false');
        });
    }
    function openDrawer() {
        document.getElementById('ww-drawer').classList.add('is-open');
        document.getElementById('ww-drawer').setAttribute('aria-hidden', 'false');
        document.getElementById('ww-drawer-backdrop').classList.add('is-open');
        document.querySelectorAll('[data-ww-open-drawer]').forEach(b => b.setAttribute('aria-expanded', 'true'));
        const f = document.querySelector('#ww-drawer .ww-close'); if (f) f.focus({ preventScroll: true });
    }
    function closeDrawer() {
        const d = document.getElementById('ww-drawer'); if (!d) return;
        d.classList.remove('is-open'); d.setAttribute('aria-hidden', 'true');
        document.getElementById('ww-drawer-backdrop').classList.remove('is-open');
        document.querySelectorAll('[data-ww-open-drawer]').forEach(b => b.setAttribute('aria-expanded', 'false'));
    }
    function closeSheets() {
        document.querySelectorAll('.ww-sheet.is-open').forEach(s => s.classList.remove('is-open'));
        document.querySelectorAll('#ww-bottom-nav [aria-expanded]').forEach(b => b.setAttribute('aria-expanded', 'false'));
        const bd = document.getElementById('ww-sheet-backdrop'); if (bd) bd.classList.remove('is-open');
    }
    function toggleSheet(id) {
        const sheet = document.getElementById(`ww-sheet-${id}`);
        const btn = document.querySelector(`#ww-bottom-nav [data-ww-sheet="${id}"]`);
        if (!sheet) return;
        const opening = !sheet.classList.contains('is-open');
        closeSheets();
        if (opening) {
            sheet.classList.add('is-open');
            btn && btn.setAttribute('aria-expanded', 'true');
            document.getElementById('ww-sheet-backdrop').classList.add('is-open');
        }
    }

    document.addEventListener('click', (e) => {
        const ddBtn = e.target.closest('[data-ww-dd] > button');
        if (ddBtn) {
            const li = ddBtn.parentElement;
            const open = !li.classList.contains('is-open');
            closeDropdowns(li);
            li.classList.toggle('is-open', open);
            ddBtn.setAttribute('aria-expanded', String(open));
            return;
        }
        if (!e.target.closest('[data-ww-dd]')) closeDropdowns();
        if (e.target.closest('[data-ww-open-drawer]')) { openDrawer(); return; }
        if (e.target.closest('[data-ww-close-drawer]')) { closeDrawer(); return; }
        const sheetBtn = e.target.closest('[data-ww-sheet]');
        if (sheetBtn) { e.preventDefault(); toggleSheet(sheetBtn.dataset.wwSheet); return; }
        if (e.target.closest('[data-ww-install]')) { promptInstall(); return; }
        if (e.target.closest('[data-ww-push]')) { togglePush(); return; }
        if (e.target.closest('#ww-drawer a, .ww-sheet a')) { closeDrawer(); closeSheets(); }
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeDropdowns(); closeDrawer(); closeSheets(); } });

    // ---------------------------------------------------------- layout mode
    function applyMode() {
        const bn = window.matchMedia(BOTTOM_NAV_QUERY).matches;
        root.classList.toggle('ww-bn-mode', bn);
        let burger = !bn && window.matchMedia(BURGER_QUERY).matches;
        if (!bn && !burger) {
            // Also switch to the sandwich if the menu doesn't fit on one row
            root.classList.remove('ww-burger-mode');
            document.querySelectorAll('[data-ww-nav-slot] .ww-menu-links').forEach(ul => {
                const slot = ul.closest('[data-ww-nav-slot]');
                if (ul.scrollWidth > slot.clientWidth + 2) burger = true;
            });
        }
        root.classList.toggle('ww-burger-mode', burger);
        if (bn) closeDrawer(); else closeSheets();
        if (!burger) closeDrawer();
    }
    let resizeTimer = null;
    window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(applyMode, 120); });
    window.addEventListener('orientationchange', applyMode);

    // ------------------------------------------------------- install (PWA)
    let installPrompt = null;
    const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; refreshInstallButtons(); });
    window.addEventListener('appinstalled', () => { installPrompt = null; refreshInstallButtons(); toast('App installed.'); });
    function refreshInstallButtons() {
        const show = !isStandalone() && (!!installPrompt || isIos());
        document.querySelectorAll('[data-ww-install]').forEach(b => { b.hidden = !show; });
    }
    async function promptInstall() {
        if (installPrompt) {
            installPrompt.prompt();
            try { await installPrompt.userChoice; } catch (e) { /* ignore */ }
            installPrompt = null; refreshInstallButtons();
        } else if (isIos()) {
            toast('On iPhone/iPad: tap the Share button, then "Add to Home Screen".', 7000);
        }
    }

    // --------------------------------------------------------- service worker
    let swReg = null;
    async function registerSw() {
        if (!('serviceWorker' in navigator) || location.protocol === 'file:') return null;
        try {
            swReg = await navigator.serviceWorker.register(rootUrl('sw.js'), { scope: SITE_ROOT });
            return swReg;
        } catch (e) { console.warn('[ww-shell] service worker:', e); return null; }
    }

    // ---------------------------------------------------- push notifications
    const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    const keyBytes = (b64) => {
        const pad = '='.repeat((4 - b64.length % 4) % 4);
        const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
        return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
    };
    async function subscriptionId(endpoint) {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint));
        return [...new Uint8Array(buf)].slice(0, 16).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    async function saveSubscription(sub) {
        const json = sub.toJSON();
        const id = await subscriptionId(json.endpoint);
        const res = await fetch(`${RTDB}/push_subscriptions/${id}.json`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys, page: location.pathname, ua: navigator.userAgent.slice(0, 160), created_at: new Date().toISOString() })
        });
        if (!res.ok) throw new Error('save HTTP ' + res.status);
    }
    async function removeSubscription(sub) {
        const id = await subscriptionId(sub.endpoint);
        await fetch(`${RTDB}/push_subscriptions/${id}.json`, { method: 'DELETE' }).catch(() => {});
    }
    async function currentSubscription() {
        if (!pushSupported()) return null;
        const reg = swReg || await navigator.serviceWorker.getRegistration(SITE_ROOT);
        return reg ? reg.pushManager.getSubscription() : null;
    }
    async function refreshPushState() {
        let label = 'Off';
        if (!pushSupported()) label = isIos() && !isStandalone() ? 'Install app first' : 'Not supported';
        else if (Notification.permission === 'denied') label = 'Blocked in browser';
        else if (await currentSubscription()) label = 'On';
        document.querySelectorAll('[data-ww-push-state]').forEach(el => { el.textContent = label; });
    }
    async function togglePush() {
        if (!pushSupported()) {
            toast(isIos() && !isStandalone() ? 'On iPhone/iPad, add this site to your Home Screen first, then turn on notifications from the app.' : 'This browser can\'t do push notifications.', 7000);
            return;
        }
        try {
            const existing = await currentSubscription();
            if (existing) {
                await removeSubscription(existing);
                await existing.unsubscribe();
                toast('Notifications turned off.');
            } else {
                const perm = await Notification.requestPermission();
                if (perm !== 'granted') { toast('Notifications were not allowed.'); refreshPushState(); return; }
                const reg = swReg || await registerSw() || await navigator.serviceWorker.ready;
                const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) });
                await saveSubscription(sub);
                toast('Notifications are on. 🔔');
            }
        } catch (e) {
            console.warn('[ww-shell] push:', e);
            toast('Could not change notifications: ' + (e.message || e), 6000);
        }
        refreshPushState();
    }

    // ---------------------------------------------------------------- boot
    async function boot() {
        ensureHead();
        const cached = readCache();
        MENU = cached ? cached.menu : [];
        render();
        if (!cached || Date.now() - cached.at > MENU_MAX_AGE_MS) {
            try { MENU = await fetchMenu(); render(); } catch (e) { console.warn('[ww-shell] menu:', e); }
        }
        await registerSw();
        refreshPushState();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
    else boot();

    window.wwShell = { refreshMenu: async () => { MENU = await fetchMenu(); render(); }, openMenu: openDrawer, togglePush, promptInstall };
})();
