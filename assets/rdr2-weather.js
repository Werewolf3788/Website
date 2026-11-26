/* ============================================================================
 * Red Dead Online catalogue — a sky that follows the real weather.
 *
 * The same idea as the "Real Weather and Real Time Sync" mod for RDR2: the
 * page looks up live conditions at the real-world town behind a frontier
 * location and paints the ground behind the catalogue to match, with the
 * clock running on that town's local time. Driven by Open-Meteo, which needs
 * no key, and cached for 20 minutes so we do not hammer it.
 *
 * Loaded on games/rdr2 only (injected by assets/menu-sheet.js).
 * ========================================================================== */
(function () {
    'use strict';

    if (document.getElementById('wwWeather')) return;

    /* Frontier location -> the real-world town it is modelled on, as the mod
       maps them. lat/lon feed Open-Meteo; timezone comes back from the API. */
    var PLACES = [
        { key: 'valentine',  label: 'Valentine, New Hanover',      lat: 42.8728,  lon: -100.5507 },
        { key: 'saintdenis', label: 'Saint Denis, Lemoyne',        lat: 29.9511,  lon: -90.0715 },
        { key: 'rhodes',     label: 'Rhodes, Lemoyne',             lat: 32.0809,  lon: -81.0912 },
        { key: 'blackwater', label: 'Blackwater, West Elizabeth',  lat: 38.5336,  lon: -92.8496 },
        { key: 'strawberry', label: 'Strawberry, West Elizabeth',  lat: 38.1967,  lon: -120.0741 },
        { key: 'annesburg',  label: 'Annesburg, New Hanover',      lat: 41.4090,  lon: -75.6624 },
        { key: 'armadillo',  label: 'Armadillo, New Austin',       lat: 31.7141,  lon: -110.0676 },
        { key: 'tumbleweed', label: 'Tumbleweed, New Austin',      lat: 31.7619,  lon: -106.4850 },
        { key: 'colter',     label: 'Colter, Ambarino',            lat: 43.4799,  lon: -110.7624 }
    ];

    var PLACE_KEY = 'ww.rdr2.weather.place';
    var CACHE_KEY = 'ww.rdr2.weather.data';
    var CACHE_MS = 20 * 60 * 1000;

    /* WMO weather codes -> the RDR2 weather family the sky mimics. */
    function classify(code) {
        if (code === 0) return { sky: 'clear', text: 'Clear skies' };
        if (code === 1) return { sky: 'clear', text: 'Mainly clear' };
        if (code === 2) return { sky: 'partly', text: 'Partly cloudy' };
        if (code === 3) return { sky: 'overcast', text: 'Overcast' };
        if (code === 45 || code === 48) return { sky: 'fog', text: 'Fog' };
        if (code >= 51 && code <= 57) return { sky: 'drizzle', text: 'Drizzle' };
        if (code >= 61 && code <= 67) return { sky: 'rain', text: 'Rain' };
        if (code >= 71 && code <= 77) return { sky: 'snow', text: 'Snow' };
        if (code >= 80 && code <= 82) return { sky: 'rain', text: 'Rain showers' };
        if (code === 85 || code === 86) return { sky: 'snow', text: 'Snow showers' };
        if (code >= 95) return { sky: 'storm', text: 'Thunderstorm' };
        return { sky: 'overcast', text: 'Overcast' };
    }

    var CSS = [
        /* The sky sits behind everything and never takes a click. */
        '#wwWeather{position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden;background:#0f1013}',
        '#wwWeather .ww-sky{position:absolute;inset:-2px;transition:background-image 1.2s ease,filter .8s ease}',
        '#wwWeather .ww-glow{position:absolute;left:50%;top:-18vmax;width:70vmax;height:70vmax;margin-left:-35vmax;border-radius:50%;opacity:.55;transition:opacity .8s ease,background .8s ease;background:radial-gradient(circle,rgba(255,226,170,.85),rgba(255,196,120,.28) 38%,transparent 68%)}',
        '#wwWeather .ww-band{position:absolute;inset:0;opacity:0;transition:opacity 1.2s ease}',
        '#wwWeather .ww-rain{background-image:repeating-linear-gradient(105deg,rgba(206,224,255,.30) 0 1px,transparent 1px 7px);background-size:auto 100%;animation:wwRain .55s linear infinite}',
        '#wwWeather .ww-snow{background-image:radial-gradient(2px 2px at 20px 30px,rgba(255,255,255,.9),transparent),radial-gradient(2px 2px at 92px 78px,rgba(255,255,255,.72),transparent),radial-gradient(1.5px 1.5px at 152px 128px,rgba(255,255,255,.82),transparent),radial-gradient(2px 2px at 60px 168px,rgba(255,255,255,.6),transparent);background-size:200px 200px;animation:wwSnow 11s linear infinite}',
        '#wwWeather .ww-fogband{opacity:0;background:radial-gradient(60% 40% at 22% 68%,rgba(232,228,214,.55),transparent 70%),radial-gradient(55% 38% at 74% 80%,rgba(226,222,208,.5),transparent 72%);animation:wwFog 34s ease-in-out infinite alternate}',
        '#wwWeather .ww-flash{background:radial-gradient(70% 55% at 50% 8%,rgba(224,232,255,.9),rgba(180,196,255,.22) 42%,transparent 70%);opacity:0}',
        '#wwWeather .ww-clouds{position:absolute;inset:-10%;opacity:.5;background:radial-gradient(38% 22% at 18% 22%,rgba(255,255,255,.34),transparent 70%),radial-gradient(44% 26% at 62% 14%,rgba(255,255,255,.26),transparent 72%),radial-gradient(34% 20% at 84% 34%,rgba(255,255,255,.22),transparent 70%);animation:wwDrift 90s ease-in-out infinite alternate}',
        '#wwWeather .ww-stars{position:absolute;inset:0;opacity:0;transition:opacity 1s ease;background-image:radial-gradient(1px 1px at 12% 18%,#fff,transparent),radial-gradient(1px 1px at 28% 8%,#fff,transparent),radial-gradient(1.4px 1.4px at 44% 24%,#fff,transparent),radial-gradient(1px 1px at 63% 12%,#fff,transparent),radial-gradient(1px 1px at 78% 28%,#fff,transparent),radial-gradient(1.2px 1.2px at 88% 6%,#fff,transparent),radial-gradient(1px 1px at 8% 42%,#fff,transparent),radial-gradient(1px 1px at 34% 36%,#fff,transparent),radial-gradient(1px 1px at 58% 44%,#fff,transparent),radial-gradient(1px 1px at 72% 38%,#fff,transparent);background-size:340px 340px}',

        /* Day skies, one per weather family. */
        '#wwWeather.ww-sky-clear .ww-sky{background-image:linear-gradient(180deg,#22465f 0%,#4e7a94 32%,#a9b39a 62%,#c9a86f 82%,#6d4f31 100%)}',
        '#wwWeather.ww-sky-partly .ww-sky{background-image:linear-gradient(180deg,#2f4a60 0%,#5d7889 34%,#9aa392 64%,#b39a72 84%,#5c4630 100%)}',
        '#wwWeather.ww-sky-overcast .ww-sky{background-image:linear-gradient(180deg,#424a52 0%,#616661 36%,#8a8375 68%,#5b4f3d 100%)}',
        '#wwWeather.ww-sky-fog .ww-sky{background-image:linear-gradient(180deg,#7e817c 0%,#96968c 38%,#aca793 72%,#736a58 100%)}',
        '#wwWeather.ww-sky-drizzle .ww-sky{background-image:linear-gradient(180deg,#38434e 0%,#525e69 34%,#787a72 70%,#3f382e 100%)}',
        '#wwWeather.ww-sky-rain .ww-sky{background-image:linear-gradient(180deg,#1f272f 0%,#36414b 36%,#565c5c 72%,#272320 100%)}',
        '#wwWeather.ww-sky-storm .ww-sky{background-image:linear-gradient(180deg,#141821 0%,#232935 38%,#3a4049 72%,#141311 100%)}',
        '#wwWeather.ww-sky-snow .ww-sky{background-image:linear-gradient(180deg,#54646f 0%,#8696a0 36%,#c3ccd2 72%,#6a6862 100%)}',

        /* Night dims the same sky and brings out the stars. */
        '#wwWeather.ww-night .ww-sky{filter:brightness(.42) saturate(.72)}',
        '#wwWeather.ww-night .ww-stars{opacity:.75}',
        '#wwWeather.ww-night .ww-glow{opacity:.3;background:radial-gradient(circle,rgba(226,236,255,.8),rgba(180,200,255,.22) 40%,transparent 68%)}',

        /* Which overlays are on. */
        '#wwWeather.ww-sky-clear .ww-glow{opacity:.6}',
        '#wwWeather.ww-sky-partly .ww-glow{opacity:.35}',
        '#wwWeather.ww-sky-overcast .ww-glow,#wwWeather.ww-sky-rain .ww-glow,#wwWeather.ww-sky-storm .ww-glow,#wwWeather.ww-sky-snow .ww-glow,#wwWeather.ww-sky-fog .ww-glow{opacity:.1}',
        '#wwWeather.ww-sky-drizzle .ww-rain,#wwWeather.ww-sky-rain .ww-rain{opacity:.5}',
        '#wwWeather.ww-sky-storm .ww-rain{opacity:.75}',
        '#wwWeather.ww-sky-snow .ww-snow{opacity:.9}',
        '#wwWeather.ww-sky-fog .ww-fogband{opacity:.9}',
        '#wwWeather.ww-sky-overcast .ww-clouds,#wwWeather.ww-sky-drizzle .ww-clouds,#wwWeather.ww-sky-rain .ww-clouds,#wwWeather.ww-sky-storm .ww-clouds{opacity:.75}',
        '#wwWeather.ww-sky-clear .ww-clouds{opacity:.28}',
        '#wwWeather.ww-sky-snow .ww-clouds{opacity:.6}',
        '#wwWeather.ww-sky-storm .ww-flash{animation:wwFlash 9s ease-out infinite}',
        '#wwWeather.ww-sky-rain .ww-sky,#wwWeather.ww-sky-storm .ww-sky{filter:brightness(.86)}',

        /* The line in the field report band. */
        '.ww-weather{grid-column:1/-1;display:flex;align-items:center;flex-wrap:wrap;gap:6px 10px;font-size:.73rem;line-height:1.5;color:#8a7458;margin-top:4px;padding-top:8px;border-top:1px dotted #d6c5a5}',
        '.ww-weather .ww-weather-kicker{font-size:.62rem;letter-spacing:.22em;text-transform:uppercase;font-weight:600}',
        '.ww-weather select{font-family:"EB Garamond",Georgia,serif;font-size:.8rem;color:#2a1e14;background:rgba(255,255,255,.55);border:1px solid #c0ac8c;padding:3px 6px;min-height:30px;max-width:100%}',
        '.ww-weather .ww-weather-now{color:#5c4633}',
        '.ww-weather .ww-weather-now b{font-family:"Rye",Georgia,serif;font-weight:400;color:#7d2b23}',
        '.ww-weather .ww-weather-muted{font-style:italic}',
        '.ww-weather a{color:#7d2b23;text-decoration:none;border-bottom:1px dotted #a1554b}',

        '@keyframes wwDrift{from{transform:translate3d(-2%,0,0)}to{transform:translate3d(3%,-1%,0)}}',
        '@keyframes wwRain{from{background-position:0 0}to{background-position:-40px 220px}}',
        '@keyframes wwSnow{from{background-position:0 0,0 0,0 0,0 0}to{background-position:26px 200px,-14px 200px,34px 200px,8px 200px}}',
        '@keyframes wwFog{from{transform:translate3d(-3%,0,0);opacity:.75}to{transform:translate3d(4%,-2%,0);opacity:1}}',
        '@keyframes wwFlash{0%,92%,100%{opacity:0}93%{opacity:1}94.5%{opacity:.15}96%{opacity:.8}97.5%{opacity:0}}',
        '@media (prefers-reduced-motion:reduce){#wwWeather *{animation:none!important}}'
    ].join('\n');

    var layer = null;
    var line = null;
    var nowEl = null;
    var select = null;
    var offsetSeconds = 0;
    var lastData = null;

    function place() {
        var saved = '';
        try { saved = localStorage.getItem(PLACE_KEY) || ''; } catch (e) { saved = ''; }
        for (var i = 0; i < PLACES.length; i++) {
            if (PLACES[i].key === saved) return PLACES[i];
        }
        return PLACES[0];
    }

    function mountLayer() {
        if (layer) return;
        layer = document.createElement('div');
        layer.id = 'wwWeather';
        layer.setAttribute('aria-hidden', 'true');
        layer.innerHTML =
            '<div class="ww-sky"></div>' +
            '<div class="ww-glow"></div>' +
            '<div class="ww-band ww-clouds"></div>' +
            '<div class="ww-band ww-stars"></div>' +
            '<div class="ww-band ww-fogband"></div>' +
            '<div class="ww-band ww-rain"></div>' +
            '<div class="ww-band ww-snow"></div>' +
            '<div class="ww-band ww-flash"></div>';
        document.body.insertBefore(layer, document.body.firstChild);
    }

    function applySky(data) {
        if (!layer) return;
        var info = classify(Number(data.weather_code));
        var night = Number(data.is_day) === 0;

        layer.className = 'ww-sky-' + info.sky + (night ? ' ww-night' : '');
        return info;
    }

    function localClock() {
        if (!nowEl) return;
        var t = new Date(Date.now() + offsetSeconds * 1000);
        var hh = String(t.getUTCHours()).padStart(2, '0');
        var mm = String(t.getUTCMinutes()).padStart(2, '0');
        var b = nowEl.querySelector('b');
        if (b) b.textContent = hh + ':' + mm;
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, function (ch) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
        });
    }

    function renderLine(data, info) {
        if (!line) return;
        var bits = [];
        if (data) {
            var temp = Math.round(Number(data.temperature_2m));
            bits.push(info ? info.text : 'Weather');
            if (!isNaN(temp)) bits.push(temp + '\u00b0C');
            if (Number(data.wind_speed_10m) >= 30) bits.push('windy');
        }
        var text = data
            ? '<b>--:--</b> local \u00b7 ' + bits.map(escapeHtml).join(' \u00b7 ')
            : '<span class="ww-weather-muted">live weather unavailable \u2014 the catalogue still works</span>';
        nowEl.innerHTML = text;
        if (data) localClock();
    }

    function mountLine() {
        var band = document.querySelector('.live');
        if (!band || line) return;

        line = document.createElement('p');
        line.className = 'ww-weather';
        line.innerHTML =
            '<span class="ww-weather-kicker">Sky over</span>' +
            '<select aria-label="Real-world weather location"></select>' +
            '<span class="ww-weather-now"></span>' +
            '<span class="ww-weather-muted">via <a href="https://open-meteo.com" target="_blank" rel="noopener">Open-Meteo</a></span>';

        select = line.querySelector('select');
        nowEl = line.querySelector('.ww-weather-now');
        var current = place();
        PLACES.forEach(function (p) {
            var opt = document.createElement('option');
            opt.value = p.key;
            opt.textContent = p.label;
            select.appendChild(opt);
        });
        select.value = current.key;
        select.addEventListener('change', function () {
            try { localStorage.setItem(PLACE_KEY, select.value); } catch (e) {}
            load(true);
        });

        var note = band.querySelector('#live-note');
        band.insertBefore(line, note || null);
    }

    function cached(placeKey) {
        try {
            var raw = sessionStorage.getItem(CACHE_KEY);
            if (!raw) return null;
            var box = JSON.parse(raw);
            if (!box || box.place !== placeKey || !box.data) return null;
            if (Date.now() - box.at > CACHE_MS) return null;
            return box.data;
        } catch (e) { return null; }
    }

    function store(placeKey, data) {
        try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ place: placeKey, at: Date.now(), data: data })); } catch (e) {}
    }

    function load(force) {
        mountLayer();
        mountLine();
        var where = place();
        var data = force ? null : cached(where.key);

        if (data) {
            lastData = data;
            offsetSeconds = Number(data.utc_offset_seconds) || 0;
            var info = applySky(data.current || {});
            renderLine(data.current || null, info);
            return;
        }

        var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + where.lat +
            '&longitude=' + where.lon +
            '&current=temperature_2m,weather_code,is_day,cloud_cover,precipitation,wind_speed_10m' +
            '&timezone=auto';

        if (select) select.disabled = true;

        fetch(url, { cache: 'no-store' })
            .then(function (r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.json();
            })
            .then(function (json) {
                if (!json || !json.current) throw new Error('no current weather');
                lastData = json;
                offsetSeconds = Number(json.utc_offset_seconds) || 0;
                store(where.key, json);
                var info = applySky(json.current);
                renderLine(json.current, info);
            })
            .catch(function () {
                /* Leave the plain dark page: a failed lookup is not an error. */
                renderLine(null, null);
            })
            .then(function () {
                if (select) select.disabled = false;
            });
    }

    function start() {
        load(false);
        setInterval(localClock, 15000);
        setInterval(function () { load(true); }, CACHE_MS);
    }

    /* The band is static HTML, so a DOMContentLoaded guard is enough. */
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }

    window.addEventListener('pageshow', function (e) { if (e.persisted) load(false); });
})();
