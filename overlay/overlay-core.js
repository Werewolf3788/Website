/* ============================================================================
 * Overlay Studio - shared settings, presets and link encoder
 *   Used by /overlay-studio.html (the form) and /overlay/live.html (what OBS shows)
 *
 * The whole overlay design is packed into the link itself (#c=...), so:
 *   - nothing is saved to Firebase (costs nothing, no sign-in needed)
 *   - anyone can build one; every user gets their own link
 *   - changing the design = build again and paste the new link
 * ========================================================================== */
(function (root) {
  'use strict';

  var POSITIONS = ['tl', 'tc', 'tr', 'ml', 'mc', 'mr', 'bl', 'bc', 'br'];

  var PRESETS = {
    werewolf: { name: 'Werewolf',    accent: '#ff5f1f', accent2: '#ffd700', panel: '#0b0b10', text: '#ffffff', font: 'Roboto' },
    neon:     { name: 'Neon Night',  accent: '#a855f7', accent2: '#22d3ee', panel: '#0d0620', text: '#f5f3ff', font: 'Orbitron' },
    ice:      { name: 'Ice',         accent: '#38bdf8', accent2: '#e0f2fe', panel: '#06121f', text: '#f0f9ff', font: 'Rajdhani' },
    toxic:    { name: 'Toxic',       accent: '#84cc16', accent2: '#facc15', panel: '#0a1004', text: '#f7fee7', font: 'Bebas Neue' },
    blood:    { name: 'Blood Moon',  accent: '#dc2626', accent2: '#f97316', panel: '#120404', text: '#fff1f2', font: 'Oswald' },
    pink:     { name: 'Pink Pop',    accent: '#ec4899', accent2: '#fde047', panel: '#1a0614', text: '#fff0f7', font: 'Poppins' },
    flora:    { name: 'Blue & Orange', accent: '#1d4ed8', accent2: '#f97316', panel: '#06102a', text: '#ffffff', font: 'Montserrat' },
    clean:    { name: 'Clean Light', accent: '#111827', accent2: '#6366f1', panel: '#ffffff', text: '#111827', font: 'Inter' },
    retro:    { name: 'Retro Arcade', accent: '#f43f5e', accent2: '#4ade80', panel: '#000000', text: '#ffffff', font: 'Press Start 2P' }
  };

  var FONTS = ['Inter', 'Roboto', 'Montserrat', 'Poppins', 'Oswald', 'Bebas Neue', 'Rajdhani',
               'Orbitron', 'Press Start 2P', 'Bangers', 'Permanent Marker', 'Russo One', 'Teko'];

  var SOCIALS = {
    twitch:    { icon: 'fa-brands fa-twitch',    label: 'Twitch' },
    youtube:   { icon: 'fa-brands fa-youtube',   label: 'YouTube' },
    tiktok:    { icon: 'fa-brands fa-tiktok',    label: 'TikTok' },
    x:         { icon: 'fa-brands fa-x-twitter', label: 'X' },
    instagram: { icon: 'fa-brands fa-instagram', label: 'Instagram' },
    discord:   { icon: 'fa-brands fa-discord',   label: 'Discord' },
    facebook:  { icon: 'fa-brands fa-facebook',  label: 'Facebook' },
    kick:      { icon: 'fa-solid fa-k',          label: 'Kick' },
    psn:       { icon: 'fa-brands fa-playstation', label: 'PSN' },
    xbox:      { icon: 'fa-brands fa-xbox',      label: 'Xbox' },
    steam:     { icon: 'fa-brands fa-steam',     label: 'Steam' },
    web:       { icon: 'fa-solid fa-globe',      label: 'Website' }
  };

  // Every setting the overlay understands. Anything missing from a link falls back to these.
  var DEFAULTS = {
    v: 1,
    channel: '',
    scene: 'live',                 // live | starting | brb | ending
    preset: 'werewolf',
    accent: '#ff5f1f', accent2: '#ffd700', panel: '#0b0b10', text: '#ffffff',
    panelOpacity: 82,              // 0-100 (0 = no boxes, text only)
    panelStyle: 'glass',           // glass | solid | outline
    radius: 12,
    glow: true,
    animate: true,
    font: 'Roboto',
    fontScale: 100,                // %
    margin: 40,
    frameImg: '',                  // full-screen PNG drawn on top (transparent areas show the game)
    sceneBg: 'clear',              // clear (see-through, default) | color | image
    bgImg: '',                     // background picture, used when sceneBg = image
    bgLive: false,                 // also put the color/picture behind the Live overlay (normally off)
    bgDim: 45,

    brand:   { on: true,  pos: 'br', logo: '', name: '', tag: '', round: true },
    chat:    { on: true,  pos: 'bl', style: 'classic', width: 380, max: 8, fade: 0, hide: 'nightbot,streamelements,streamlabs', badges: true, size: 100 },
    alerts:  { on: true,  pos: 'tc', img: '', sound: '', secs: 7, subs: true, gifts: true, raids: true, bits: true, follows: true, tips: true },
    clock:   { on: true,  pos: 'tr', tz: '', h24: false, label: '' },
    game:    { on: true,  pos: 'br', prefix: 'Now playing' },
    title:   { on: false, pos: 'tl' },
    goal:    { on: false, pos: 'tr', label: 'Follower goal', target: 100 },
    socials: { on: true,  pos: 'tr', rotate: true, list: [] },   // list: [{k:'twitch', v:'name'}]
    qr:      { on: false, pos: 'tr', url: '', label: 'Scan me' },
    ticker:  { on: false, edge: 'bottom', text: 'Welcome to the stream! • Drop a follow • Be kind in chat', speed: 60 },
    cam:     { on: false, x: 1440, y: 40, w: 440, h: 248, shape: 'rounded', border: 4, label: '' },

    scenes: {
      starting: { title: 'Starting Soon', sub: 'Grab a snack, the stream starts in', mins: 5, chat: true },
      brb:      { title: 'Be Right Back', sub: "Don't go anywhere", mins: 0, chat: true },
      ending:   { title: 'Thanks for Watching', sub: 'See you next stream', mins: 0, chat: false }
    }
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function isObj(o) { return o && typeof o === 'object' && !Array.isArray(o); }

  // Deep-merge src on top of base (arrays are replaced, not merged)
  function merge(base, src) {
    var out = clone(base);
    if (!isObj(src)) return out;
    Object.keys(src).forEach(function (k) {
      if (isObj(src[k]) && isObj(out[k])) out[k] = merge(out[k], src[k]);
      else if (src[k] !== undefined) out[k] = src[k];
    });
    return out;
  }

  // Only keep what differs from the defaults so links stay short
  function diff(cfg, base) {
    var out = {};
    Object.keys(cfg).forEach(function (k) {
      if (isObj(cfg[k]) && isObj(base[k])) {
        var d = diff(cfg[k], base[k]);
        if (Object.keys(d).length) out[k] = d;
      } else if (JSON.stringify(cfg[k]) !== JSON.stringify(base[k])) {
        out[k] = cfg[k];
      }
    });
    return out;
  }

  // ---- base64url helpers ----
  function bytesToB64u(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64uToBytes(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    var bin = atob(str), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  // Pack settings into a short link-safe string. "z" = compressed, "j" = plain.
  async function encode(cfg) {
    var json = JSON.stringify(diff(cfg, DEFAULTS));
    var raw = new TextEncoder().encode(json);
    if (typeof CompressionStream === 'function') {
      try {
        var stream = new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate-raw'));
        var buf = new Uint8Array(await new Response(stream).arrayBuffer());
        return 'z' + bytesToB64u(buf);
      } catch (e) { /* fall through */ }
    }
    return 'j' + bytesToB64u(raw);
  }

  async function decode(str) {
    if (!str) return clone(DEFAULTS);
    var kind = str[0], bytes = b64uToBytes(str.slice(1)), json;
    if (kind === 'z') {
      var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      json = await new Response(stream).text();
    } else {
      json = new TextDecoder().decode(bytes);
    }
    return merge(DEFAULTS, JSON.parse(json));
  }

  // Pull the settings string out of any overlay link someone pastes back in
  function fromLink(link) {
    var m = String(link || '').match(/[#&?]c=([A-Za-z0-9_-]+)/);
    return m ? m[1] : '';
  }

  // Turn share links (Google Drive, Dropbox, Imgur pages) into direct image links
  function fixImg(url) {
    url = String(url || '').trim();
    if (!url) return '';
    var m = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]{10,})/);
    if (m) return 'https://lh3.googleusercontent.com/d/' + m[1];
    if (/dropbox\.com\//.test(url)) return url.replace(/[?&]dl=0/, '').replace(/\?$/, '') + (url.indexOf('?') > -1 ? '&raw=1' : '?raw=1');
    m = url.match(/^https?:\/\/imgur\.com\/(\w+)$/);
    if (m) return 'https://i.imgur.com/' + m[1] + '.png';
    return url;
  }

  root.OverlayCore = {
    POSITIONS: POSITIONS, PRESETS: PRESETS, FONTS: FONTS, SOCIALS: SOCIALS, DEFAULTS: DEFAULTS,
    clone: clone, merge: merge, encode: encode, decode: decode, fromLink: fromLink, fixImg: fixImg
  };
})(window);
