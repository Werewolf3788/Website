/* When the "Overlay by werewolf3788" credit shows on a free browser-source overlay (overlay/live.html).
 * Same rules as the Twitch extension (server/stream-sync/lib/extension.js):
 *   free overlays   after a random 20-40 min of live time since the last one (live time carries over
 *                   restarts), only while 2+ people are watching
 *   Founder / allies  once per 30 days, 5+ min into a stream with 2+ viewers (never on the owner's channel)
 *   other paid tiers  never
 * uptime: seconds live (number), null = offline, undefined = unknown (YouTube/Kick: treated as live, no viewer check).
 * Pure functions; live.html keeps the state in localStorage. Tested in server/stream-sync/test/wm-clock.test.js. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.WWClock = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var MIN = 60000, DAY = 86400000;
  function target(rand) { return 1200 + Math.floor(rand() * 1201); }
  function fresh(rand) { return { liveSec: 0, target: target(rand), lastTick: 0, lastLive: false, lastCreditAt: 0 }; }
  function parseUptime(t) {
    t = String(t || '').toLowerCase(); if (!t || /offline|error|not found/.test(t)) return null;
    var s = 0, m;
    if ((m = t.match(/(\d+)\s*day/))) s += +m[1] * 86400;
    if ((m = t.match(/(\d+)\s*hour/))) s += +m[1] * 3600;
    if ((m = t.match(/(\d+)\s*minute/))) s += +m[1] * 60;
    if ((m = t.match(/(\d+)\s*second/))) s += +m[1];
    return s || null;
  }
  // o: { now, uptime, viewers, tier, founder, ally, owner, rand } -> { state, show: 'wm' | 'credit' | null }
  function step(state, o) {
    var st = Object.assign({}, state), live = o.uptime !== null, show = null;
    var dt = st.lastTick ? Math.min(o.now - st.lastTick, 2 * MIN) : 0;
    if (live && st.lastLive) st.liveSec += dt / 1000;
    var viewersOk = o.viewers === undefined || o.viewers === null ? o.uptime === undefined : o.viewers >= 2;
    var free = !o.tier && !o.ally, monthly = !!o.founder || (!!o.ally && !o.owner);
    if (free && live && st.liveSec >= st.target && viewersOk) { show = 'wm'; st.liveSec = 0; st.target = target(o.rand || Math.random); }
    else if (!free && monthly && live && viewersOk && (o.uptime === undefined || o.uptime >= 300) && o.now - (st.lastCreditAt || 0) >= 30 * DAY) { show = 'credit'; st.lastCreditAt = o.now; }
    st.lastTick = o.now; st.lastLive = live;
    return { state: st, show: show };
  }
  return { fresh: fresh, step: step, parseUptime: parseUptime, target: target };
}));
