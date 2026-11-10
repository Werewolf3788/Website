/* ============================================================================
   Werewolf Project - shared sign-in (loaded by assets/ww-shell.js on every page)

   1. Puts a Sign in button / account chip where a phone can always reach it:
        - the shell top bar (pages without their own header)
        - next to the menu slot in a page's own header
        - the first row of the slide-in drawer and of the phone "More" sheet
      (pages that already have their own sign-in button, #authModalBtn, are left alone)
   2. Keeps you signed in:
        - Firebase persistence is forced to LOCAL (survives refresh / app restart)
        - the signed-in profile is cached in localStorage ("ww_auth_user_v1") and shown
          instantly on load, so the page never flashes "Sign in" while Firebase restores
          the session. It is only cleared when Firebase confirms you are signed out.
   Uses the same Firebase default app as the rest of the site, so signing in here also
   signs you in on the game / farm / board-game pages.
   ========================================================================== */
(function () {
    'use strict';
    if (window.WWAuth) return;

    const CACHE_KEY = 'ww_auth_user_v1';
    const SDK = 'https://www.gstatic.com/firebasejs/8.10.1/';
    const CFG = {
        apiKey: 'AIzaSyDeuNBGHcwU4rFyOcsfGxLHjmEdpADacmc',
        authDomain: 'entertainment-71888.firebaseapp.com',
        databaseURL: 'https://entertainment-71888-default-rtdb.firebaseio.com',
        projectId: 'entertainment-71888',
        storageBucket: 'entertainment-71888.firebasestorage.app',
        messagingSenderId: '660524340277',
        appId: '1:660524340277:web:ef8f4ed04fa985a4f88d7c'
    };

    const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const readCache = () => { try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch (e) { return null; } };
    const writeCache = (u) => { try { u ? localStorage.setItem(CACHE_KEY, JSON.stringify(u)) : localStorage.removeItem(CACHE_KEY); } catch (e) { /* private mode */ } };

    let user = readCache();          // shown immediately; confirmed by Firebase below
    let confirmed = false;           // true once Firebase has told us the real state
    let auth = null;

    // ------------------------------------------------------------ Firebase
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = src; s.onload = resolve; s.onerror = () => reject(new Error('load failed: ' + src));
            document.head.appendChild(s);
        });
    }
    async function ensureAuth() {
        if (auth) return auth;
        if (!window.firebase) await loadScript(SDK + 'firebase-app.js');
        if (!window.firebase) throw new Error('Firebase SDK unavailable');
        if (!window.firebase.auth) await loadScript(SDK + 'firebase-auth.js');
        const apps = firebase.apps || [];
        // Reuse the page's own app for this project so the session is shared
        let app = apps.find(a => a.options && a.options.apiKey === CFG.apiKey);
        if (!app) app = apps.length ? firebase.initializeApp(CFG, 'ww-auth') : firebase.initializeApp(CFG);
        auth = firebase.auth(app);
        // Stay signed in across refreshes and restarts; fall back if storage is restricted
        const P = firebase.auth.Auth.Persistence;
        try { await auth.setPersistence(P.LOCAL); }
        catch (e) { try { await auth.setPersistence(P.SESSION); } catch (e2) { /* in-memory only */ } }
        return auth;
    }

    function toProfile(u) {
        return u ? { uid: u.uid, name: u.displayName || (u.email ? u.email.split('@')[0] : 'Member'), email: u.email || '', photo: u.photoURL || '', at: Date.now() } : null;
    }

    async function start() {
        try {
            await ensureAuth();
            try { await auth.getRedirectResult(); } catch (e) { /* ignored: onAuthStateChanged reports the user */ }
            auth.onAuthStateChanged((u) => {
                confirmed = true;
                user = toProfile(u);
                writeCache(user);
                mount();
                window.dispatchEvent(new CustomEvent('ww-auth', { detail: { user } }));
            });
        } catch (e) {
            console.warn('[ww-auth] could not start Firebase Auth - keeping the saved sign-in on screen', e);
        }
    }

    async function signIn() {
        try {
            await ensureAuth();
            const p = new firebase.auth.GoogleAuthProvider();
            try { await auth.signInWithPopup(p); }
            catch (e) {
                if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment')) return auth.signInWithRedirect(p);
                if (e && (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request')) return;
                throw e;
            }
        } catch (e) {
            let m = (e && e.message) || String(e);
            if (e && e.code === 'auth/unauthorized-domain') m = 'This address (' + location.hostname + ') is not in Firebase > Authentication > Authorized domains.';
            alert('Sign-in problem: ' + m);
        }
    }
    async function signOut() { try { await ensureAuth(); await auth.signOut(); } catch (e) { console.warn(e); } writeCache(null); user = null; mount(); }

    // ------------------------------------------------------------------ UI
    const css = document.createElement('style');
    css.textContent = `
.ww-acct{position:relative;display:inline-flex;align-items:center;flex:0 0 auto;font-family:var(--ww-font,system-ui,sans-serif)}
.ww-acct-btn{display:inline-flex;align-items:center;gap:8px;min-height:40px;max-width:46vw;padding:0 14px;border-radius:999px;cursor:pointer;
  border:1px solid var(--ww-accent,#38bdf8);background:var(--ww-accent,#38bdf8);color:#0b1120;font:800 .85rem var(--ww-font,system-ui,sans-serif);white-space:nowrap}
.ww-acct-btn.is-in{background:var(--ww-bg-2,#1e293b);color:var(--ww-text,#e2e8f0);border-color:var(--ww-border,rgba(148,163,184,.3));padding:0 12px 0 5px}
.ww-acct-btn img{width:30px;height:30px;border-radius:50%;object-fit:cover;flex:0 0 auto}
.ww-acct-btn span{overflow:hidden;text-overflow:ellipsis}
.ww-acct-pop{display:none;position:absolute;right:0;top:calc(100% + 6px);z-index:9600;min-width:180px;padding:10px;border-radius:12px;
  background:var(--ww-bg,#0f172a);border:1px solid var(--ww-border,rgba(148,163,184,.3));box-shadow:0 16px 40px rgba(0,0,0,.55);color:var(--ww-text,#e2e8f0)}
.ww-acct.is-open .ww-acct-pop{display:block}
.ww-acct-pop small{display:block;opacity:.7;margin-bottom:8px;word-break:break-all}
.ww-acct-pop button{width:100%;min-height:40px;border-radius:10px;border:1px solid var(--ww-border,rgba(148,163,184,.3));background:var(--ww-bg-2,#1e293b);color:inherit;font:700 .85rem var(--ww-font,system-ui,sans-serif);cursor:pointer}
.ww-acct-row{display:flex;align-items:center;gap:10px;padding:10px 4px 12px;border-bottom:1px solid var(--ww-border,rgba(148,163,184,.2));margin-bottom:6px}
.ww-acct-row .ww-acct{flex:1 1 auto}
.ww-acct-row .ww-acct-btn{max-width:none;width:100%;justify-content:center}
.ww-acct-row .ww-acct-pop{position:static;display:block;border:0;box-shadow:none;background:none;padding:0;min-width:0}
`;
    document.head.appendChild(css);

    function chipHtml(inRow) {
        if (user) {
            const av = user.photo ? `<img src="${esc(user.photo)}" alt="" referrerpolicy="no-referrer">` : '';
            return `<div class="ww-acct" data-ww-acct><button type="button" class="ww-acct-btn is-in" data-ww-acct-toggle aria-haspopup="true">${av}<span>${esc(user.name)}</span></button>
<div class="ww-acct-pop"><small>${esc(user.email)}</small><button type="button" data-ww-acct-out>Sign out</button></div></div>`;
        }
        return `<div class="ww-acct" data-ww-acct><button type="button" class="ww-acct-btn" data-ww-acct-in>Sign in</button></div>`;
    }

    // Remove everything we mounted last time, then mount again (the shell re-renders its menus)
    function mount() {
        document.querySelectorAll('[data-ww-acct-mount]').forEach(n => n.remove());
        const hasOwn = !!document.getElementById('authModalBtn');   // game pages bring their own Sign in button

        if (!hasOwn) {
            const bar = document.getElementById('ww-topbar');
            const slots = bar ? [bar.querySelector('[data-ww-nav-slot]')] : Array.from(document.querySelectorAll('[data-ww-nav-slot]'));
            slots.filter(Boolean).forEach(slot => {
                const w = document.createElement('div');
                w.setAttribute('data-ww-acct-mount', ''); w.style.cssText = 'display:inline-flex;align-items:center;margin-left:8px;flex:0 0 auto';
                w.innerHTML = chipHtml();
                if (bar) bar.appendChild(w); else slot.insertAdjacentElement('afterend', w);
            });
        }
        // Drawer + phone "More" sheet: always available, even on pages with their own header
        document.querySelectorAll('#ww-drawer, #ww-sheet-more').forEach(box => {
            const row = document.createElement('div');
            row.className = 'ww-acct-row'; row.setAttribute('data-ww-acct-mount', '');
            row.innerHTML = user
                ? `<div class="ww-acct" data-ww-acct><div class="ww-acct-pop"><small>Signed in as ${esc(user.name)}<br>${esc(user.email)}</small><button type="button" data-ww-acct-out>Sign out</button></div></div>`
                : `<div class="ww-acct" data-ww-acct><button type="button" class="ww-acct-btn" data-ww-acct-in>Sign in with Google</button></div>`;
            const first = box.querySelector('.ww-sheet-title, .ww-drawer-head');
            if (first) first.insertAdjacentElement('afterend', row); else box.insertBefore(row, box.firstChild);
        });
    }

    document.addEventListener('click', (e) => {
        const t = e.target.closest && e.target.closest('[data-ww-acct-in],[data-ww-acct-out],[data-ww-acct-toggle]');
        const open = document.querySelector('.ww-acct.is-open');
        if (!t) { if (open) open.classList.remove('is-open'); return; }
        if (t.hasAttribute('data-ww-acct-in')) signIn();
        else if (t.hasAttribute('data-ww-acct-out')) signOut();
        else { const a = t.closest('.ww-acct'); if (open && open !== a) open.classList.remove('is-open'); a.classList.toggle('is-open'); }
    });

    // Another tab signed in / out -> follow it
    window.addEventListener('storage', (e) => { if (e.key === CACHE_KEY) { user = readCache(); mount(); } });
    // The shell rebuilds its menus (cache refresh, resize) -> mount again
    window.addEventListener('ww-shell-rendered', mount);

    window.WWAuth = { signIn, signOut, get user() { return user; }, get confirmed() { return confirmed; } };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { mount(); start(); });
    else { mount(); start(); }
})();
