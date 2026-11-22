/* ============================================================================
   assets/psn-source.js  —  point every PSN read at the playstation-stats project

   The PSN engine (Playstation/psn.js) writes player cards only to the
   playstation-stats Realtime Database -- entertainment-71888 is not meant to
   hold any PSN data. Older pages still fetch
   entertainment-71888 .../psn/... .json URLs. Load this script BEFORE the
   page's own scripts and those fetches are sent to playstation-stats instead
   (signed in anonymously). If that redirect fails, the original URL is used
   as a last resort, but since nothing mirrors PSN data into entertainment-71888
   anymore that fallback will come back empty rather than stale.

   /psn/games and /psn/games/{commId} are a special case: psn.js has never
   written a games catalog to RTDB at all -- the full catalog (trophies,
   DLC groups, posterArt, platform, file size, multiplayer info, etc.) only
   ever gets saved to playstation-stats *Firestore* (meta/gameIndex ->
   games/{key}). So these two paths are read from that Firestore project
   instead (same anon auth token, used as a Bearer token) and reshaped into
   the same flat JSON old pages already expect, rather than ever touching
   RTDB for them.

   Also exposes window.wwPsn = { url(path), get(path) } for new code.
   ========================================================================== */
(function () {
    'use strict';
    if (window.wwPsn) return;
    var PSN_DB = 'https://playstation-stats-default-rtdb.firebaseio.com';
    var API_KEY = 'AIzaSyBT3RHrZQCcBdcoPpM9hMjuzSB0KBtu5UI';
    var TOKEN_KEY = 'ww_psn_anon_token_v1';
    var OLD_RE = /^(https?:)?\/\/entertainment-71888-default-rtdb\.firebaseio\.com(\/psn(?:[\/.][^?#]*)?)(\?[^#]*)?$/i;
    var nativeFetch = window.fetch.bind(window);
    var tokenPromise = null;

    function readToken() {
        try { var t = JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null'); if (t && t.exp > Date.now() + 60000) return t; } catch (e) {}
        return null;
    }
    function saveToken(t) { try { localStorage.setItem(TOKEN_KEY, JSON.stringify(t)); } catch (e) {} }

    function getToken() {
        var cached = readToken();
        if (cached) return Promise.resolve(cached.idToken);
        if (tokenPromise) return tokenPromise;
        var prev = null; try { prev = JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null'); } catch (e) {}
        var req = prev && prev.refreshToken
            ? nativeFetch('https://securetoken.googleapis.com/v1/token?key=' + API_KEY, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(prev.refreshToken) })
                .then(function (r) { return r.json(); }).then(function (j) { return j && j.id_token ? { idToken: j.id_token, refreshToken: j.refresh_token, expiresIn: j.expires_in } : null; })
            : Promise.resolve(null);
        tokenPromise = req.then(function (t) {
            if (t) return t;
            return nativeFetch('https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=' + API_KEY, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }) })
                .then(function (r) { return r.json(); })
                .then(function (j) { return j && j.idToken ? { idToken: j.idToken, refreshToken: j.refreshToken, expiresIn: j.expiresIn } : null; });
        }).then(function (t) {
            tokenPromise = null;
            if (!t) return null;
            saveToken({ idToken: t.idToken, refreshToken: t.refreshToken, exp: Date.now() + (Number(t.expiresIn) || 3600) * 1000 });
            return t.idToken;
        }).catch(function () { tokenPromise = null; return null; });
        return tokenPromise;
    }

    function psnUrl(path, query, token) {
        var p = path.charAt(0) === '/' ? path : '/' + path;
        if (!/\.json$/i.test(p)) p += '.json';
        var q = (query || '').replace(/^\?/, '');
        var parts = q ? [q] : [];
        if (token) parts.push('auth=' + encodeURIComponent(token));
        return PSN_DB + p + (parts.length ? '?' + parts.join('&') : '');
    }

    // Gamer tags are stored under the real PSN ID (e.g. "WildHorse_Spirit"). Old pages ask for
    // "wildhorse_spirit": look the real spelling up once (psn/usersByGamerTag) and use that.
    var realIdsPromise = null;
    function realIds(token) {
        if (!realIdsPromise) {
            realIdsPromise = nativeFetch(psnUrl('/psn/usersByGamerTag', 'shallow=true', token))
                .then(function (r) { return r.ok ? r.json() : null; })
                .then(function (m) { var out = {}; Object.keys(m || {}).forEach(function (k) { out[k.toLowerCase()] = k; }); return out; })
                .catch(function () { return {}; });
        }
        return realIdsPromise;
    }
    function canonical(path, token) {
        var m = path.match(/^(\/psn\/gamertags\/)([^\/.]+)(.*)$/i);
        if (!m) return Promise.resolve(path);
        return realIds(token).then(function (ids) { var real = ids[m[2].toLowerCase()]; return real ? m[1] + real + m[3] : path; });
    }

    // The RTDB /psn/games path has never actually had data in it -- Playstation/psn.js
    // only ever saves the game catalog (trophies, DLC groups, posterArt, platform,
    // file size, multiplayer info, etc.) to playstation-stats *Firestore*, under
    // meta/gameIndex -> games/{key}. Pages that ask for /psn/games(.json) or
    // /psn/games/{commId}.json are reading a node that's permanently empty on the
    // RTDB side, so instead of falling back to a dead copy, fetch the real thing
    // here and reshape it into the same flat JSON these pages already expect.
    var FS_BASE = 'https://firestore.googleapis.com/v1/projects/playstation-stats/databases/(default)/documents';
    function unwrapFsValue(v) {
        if (!v || typeof v !== 'object') return null;
        if ('stringValue' in v) return v.stringValue;
        if ('integerValue' in v) return parseInt(v.integerValue, 10);
        if ('doubleValue' in v) return v.doubleValue;
        if ('booleanValue' in v) return v.booleanValue;
        if ('nullValue' in v) return null;
        if ('timestampValue' in v) return v.timestampValue;
        if ('arrayValue' in v) return (v.arrayValue.values || []).map(unwrapFsValue);
        if ('mapValue' in v) return unwrapFsFields(v.mapValue.fields || {});
        return null;
    }
    function unwrapFsFields(fields) {
        var out = {};
        Object.keys(fields || {}).forEach(function (k) { out[k] = unwrapFsValue(fields[k]); });
        return out;
    }
    function fsDocName(resourceName) {
        var parts = (resourceName || '').split('/');
        return parts[parts.length - 1];
    }
    var gameIndexPromise = null;
    function gameIndexEntries(token) {
        if (!gameIndexPromise) {
            gameIndexPromise = nativeFetch(FS_BASE + '/meta/gameIndex', { headers: { Authorization: 'Bearer ' + token } })
                .then(function (r) { return r.ok ? r.json() : null; })
                .then(function (doc) { var f = doc && unwrapFsFields(doc.fields); return (f && f.entries) || {}; })
                .catch(function () { return {}; });
        }
        return gameIndexPromise;
    }
    function getGameSkeleton(commId, token) {
        return gameIndexEntries(token).then(function (entries) {
            var entry = entries[String(commId || '').toUpperCase()];
            if (!entry || !entry.key) return null;
            return nativeFetch(FS_BASE + '/games/' + encodeURIComponent(entry.key), { headers: { Authorization: 'Bearer ' + token } })
                .then(function (r) { return r.ok ? r.json() : null; })
                .then(function (doc) { return doc ? unwrapFsFields(doc.fields) : null; });
        }).catch(function () { return null; });
    }
    function getAllGameSkeletons(token) {
        return nativeFetch(FS_BASE + '/games?pageSize=300', { headers: { Authorization: 'Bearer ' + token } })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (res) {
                var out = {};
                (res && res.documents || []).forEach(function (doc) {
                    var data = unwrapFsFields(doc.fields);
                    out[data.gameKey || data.commId || fsDocName(doc.name)] = data;
                });
                return out;
            }).catch(function () { return {}; });
    }
    function jsonResponse(value) {
        return new Response(value === undefined ? 'null' : JSON.stringify(value), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Read a /psn/... path; real PSN ID first, then the exact key, then the lowercase key.
    function get(path) {
        return getToken().then(function (token) { return canonical(path, token).then(function (real) { return [token, real]; }); })
        .then(function (tp) {
            var token = tp[0], tries = [tp[1]];
            if (tp[1] !== path) tries.push(path);
            var lower = path.replace(/(\/psn\/gamertags\/)([^\/.]+)/i, function (m, a, b) { return a + b.toLowerCase(); });
            if (lower !== path) tries.push(lower);
            var i = 0;
            function next() {
                if (i >= tries.length) return null;
                return nativeFetch(psnUrl(tries[i++], 't=' + Date.now(), token)).then(function (r) { return r.ok ? r.json() : null; })
                    .then(function (v) { return v == null ? next() : v; }).catch(next);
            }
            return next();
        });
    }

    window.fetch = function (input, init) {
        var url = typeof input === 'string' ? input : (input && input.url) || '';
        var m = url.match(OLD_RE);
        if (!m || (init && init.method && init.method.toUpperCase() !== 'GET')) return nativeFetch(input, init);
        var asked = m[2].replace(/\.json$/i, '');
        var gamesMatch = asked.match(/^\/psn\/games(?:\/([^\/]+))?$/i);
        if (gamesMatch) {
            return getToken().then(function (token) {
                if (!token) return nativeFetch(input, init);
                return (gamesMatch[1] ? getGameSkeleton(gamesMatch[1], token) : getAllGameSkeletons(token))
                    .then(jsonResponse);
            }).catch(function () { return nativeFetch(input, init); });
        }
        return getToken().then(function (token) {
            if (!token) return nativeFetch(input, init);
            return canonical(asked, token).then(function (path) {
            var lower = path.replace(/(\/psn\/gamertags\/)([^\/.]+)/i, function (x, a, b) { return a + b.toLowerCase(); });
            return nativeFetch(psnUrl(path, m[3], token), init).then(function (r) {
                if (!r.ok) return nativeFetch(input, init);
                return r.clone().json().then(function (v) {
                    if (v != null) return r;
                    if (lower !== path) return nativeFetch(psnUrl(lower, m[3], token), init).then(function (r2) { return r2.ok ? r2.clone().json().then(function (v2) { return v2 != null ? r2 : nativeFetch(input, init); }) : nativeFetch(input, init); });
                    return nativeFetch(input, init);
                });
            });
            });
        }).catch(function () { return nativeFetch(input, init); });
    };

    window.wwPsn = { url: function (p) { return psnUrl(p); }, get: get, token: getToken, db: PSN_DB };
})();
