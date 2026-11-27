/* ============================================================================
 * Werewolf passes: one pass covers Overlay Studio AND the Twitch extension.
 * Prices are locked for life and the same for everyone (no Affiliate/Partner bump).
 *   Tier 1  Twitch basics, no watermark
 *   Tier 2  + site account: tracker, View more, Stream Together allies
 *   Tier 3  + PlayStation: live game/status, same-game allies
 * Terms: month (31 days), year (365), lifetime (one payment), founder (cheaper lifetime for the first 25
 * buyers; shows a small werewolf3788 credit once a month - must be agreed to before paying).
 * Stored in Firestore overlay_pro/{account}: { tiers: { "1": { until } | { lifetime:true, founder? } }, lifetimePaid, agreement }
 * Old passes ({ until } with no tiers) count as Tier 1. Allies (owner's friends list) are Tier 3 free.
 * ========================================================================== */
'use strict';

const TIERS = {
  1: { month: '5.00', year: '50.00', lifetime: '125.00', founder: '99.00' },
  2: { month: '10.00', year: '100.00', lifetime: '250.00', founder: '199.00' },
  3: { month: '20.00', year: '200.00', lifetime: '500.00', founder: '399.00' }
};
const TERM_DAYS = { month: 31, year: 365 };
const FOUNDER_LIMIT = 25;
const TERMS_VERSION = '2026-11-26';
const TIER_NAME = { 1: 'Tier 1 (no watermark)', 2: 'Tier 2 (+ game tracker)', 3: 'Tier 3 (+ PlayStation)' };
const TERM_NAME = { month: '1 month', year: '1 year', lifetime: 'Lifetime', founder: 'Founder lifetime' };
const money = v => (Math.round((parseFloat(v) || 0) * 100) / 100).toFixed(2);

// -> { tier: 0..3, lifetime, founder, until }
function effectiveTier(doc, now, ally) {
  if (ally) return { tier: 3, lifetime: false, founder: false, until: 0, ally: true };
  const d = doc || {}, t = d.tiers || (Number(d.until) ? { 1: { until: Number(d.until) } } : {});
  for (const n of [3, 2, 1]) {
    const e = t[n] || t[String(n)];
    if (e && (e.lifetime || Number(e.until) > now)) return { tier: n, lifetime: !!e.lifetime, founder: !!e.founder, until: e.lifetime ? 0 : Number(e.until) };
  }
  return { tier: 0, lifetime: false, founder: false, until: 0 };
}

// price for this tier + term; lifetime / founder upgrades only pay the difference from lifetime already paid
function priceFor(tier, term, doc) {
  const P = TIERS[tier]; if (!P || !P[term]) return null;
  if (term === 'lifetime' || term === 'founder') return money(Math.max(0, parseFloat(P[term]) - parseFloat((doc && doc.lifetimePaid) || 0)));
  return money(P[term]);
}
const okTier = t => !!TIERS[t];
const okTerm = t => t === 'month' || t === 'year' || t === 'lifetime' || t === 'founder';

module.exports = { TIERS, TERM_DAYS, FOUNDER_LIMIT, TERMS_VERSION, TIER_NAME, TERM_NAME, effectiveTier, priceFor, okTier, okTerm, money };
