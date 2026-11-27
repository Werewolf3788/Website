/* ============================================================================
 * Overlay Studio "Remove watermark" passes (mounted on ww-discord-auth next to the game shop)
 *
 *   GET  /overlay/pro/:channel           -> { pro, until }   is this Twitch channel paid up? (the live overlay asks)
 *   GET  /overlay/plans                  -> { currency, tier, plans }
 *   Paying happens on Buy Me a Coffee (bmc.js): the page gets a claim code from POST /bmc/claim (kind=overlay),
 *   and when the payment webhook arrives bmc.js calls grantPass() below.
 *        Firestore:  overlay_pro/{channel}   { until, plan, orders[], payer, updated }
 *                    purchases/bmc_{claim}   ledger row (create() fails on reuse = no double credit)
 *        Buying again while still paid adds the time on to the end.
 *
 * Passes are paid up front (not auto-renewing): month = 31 days, year = 365 days.
 * Tiers, terms and prices: tiers.js (same price for everyone). Twitch channels are still checked with Twitch
 * (twitch_client_id / twitch_client_secret from the Key Vault) so a typo'd name can't be paid for.
 * No sign-in needed - the pass belongs to the Twitch channel typed in the Overlay Studio.
 * ========================================================================== */
'use strict';

// ---- Prices: tiers.js (locked for life, one price for everyone; one pass covers Overlay Studio + the Twitch extension) ----
const T = require('./tiers');
const LIFETIME_UNTIL = 32503680000000;   // year 3000: what old readers of overlay_pro.until see for a lifetime pass
const CURRENCY = 'USD';
const DAY = 86400000;
const money = v => (Math.round(parseFloat(v) * 100) / 100).toFixed(2);
const cleanChan = c => String(c || '').trim().toLowerCase().replace(/^(https?:\/\/)?(www\.|m\.)?(twitch\.tv|kick\.com|youtube\.com)\/((channel|c|user)\/)?/, '').replace(/^@/, '').split(/[/?#\s]/)[0];
const okChan = c => /^[a-z0-9_]{3,25}$/.test(c);
// The pass belongs to a streaming account: platform + username. No sign-up needed.
//   doc id in Firestore overlay_pro:  twitch -> "name" (as before),  youtube -> "youtube:name",  kick -> "kick:name"
const PLAT = { twitch: /^[a-z0-9_]{3,25}$/, youtube: /^[a-z0-9_.-]{3,30}$/, kick: /^[a-z0-9_-]{3,25}$/ };
const HOST = { twitch: 'twitch.tv/', youtube: 'youtube.com/@', kick: 'kick.com/' };
function account(platform, name) {
  platform = PLAT[platform] ? platform : 'twitch'; name = cleanChan(name);
  if (!PLAT[platform].test(name)) return null;
  return { platform, name, id: platform === 'twitch' ? name : platform + ':' + name, label: HOST[platform] + name };
}
const okId = id => /^([a-z]+:)?[a-z0-9_.-]{3,30}$/.test(String(id || ''));

const SITE_ORIGINS = ['https://entertainment-71888.web.app', 'https://entertainment-71888.firebaseapp.com', 'https://werewolf3788.github.io'];

function mountOverlayPro(app, { admin, fetchFn, cors: baseCors }) {
  const fs = () => admin.firestore();
  const cors = (req, res) => {   // the site's own origins always allowed, plus whatever the server already allows
    const o = req.headers.origin;
    if (o && SITE_ORIGINS.includes(o)) { res.setHeader('Access-Control-Allow-Origin', o); res.setHeader('Vary', 'Origin'); }
    else baseCors(req, res);
  };
  const proCache = new Map();   // channel -> { at, body }   keeps Firestore reads tiny

  // ---- Is this channel a Twitch Affiliate / Partner? (Twitch app login, keys from the Key Vault) ----
  let tw = { token: '', exp: 0 }; const tierCache = new Map();
  async function vault(name) {
    const owner = process.env.DISCORD_APP_OWNER_KEY; if (!owner) return '';
    try { return String((await admin.database().ref('user_secrets/' + owner + '/' + name).once('value')).val() || '').trim(); } catch (e) { return ''; }
  }
  async function twitchToken() {
    if (tw.token && Date.now() < tw.exp) return tw;
    const id = process.env.TWITCH_CLIENT_ID || await vault('twitch_client_id'), secret = process.env.TWITCH_CLIENT_SECRET || await vault('twitch_client_secret');
    if (!id || !secret) throw new Error('twitch keys missing from Key Vault');
    const r = await fetchFn('https://id.twitch.tv/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: id, client_secret: secret, grant_type: 'client_credentials' }).toString() });
    const j = await r.json(); if (!j.access_token) throw new Error('twitch token failed (' + r.status + ')');
    tw = { token: j.access_token, id, exp: Date.now() + Math.max(60, (j.expires_in || 3600) - 300) * 1000 }; return tw;
  }
  // -> { tier: 'standard'|'earner', type: ''|'affiliate'|'partner', found }
  async function channelTier(ch) {
    const hit = tierCache.get(ch); if (hit && Date.now() - hit.at < 3600000) return hit.v;
    const t = await twitchToken();
    const r = await fetchFn('https://api.twitch.tv/helix/users?login=' + encodeURIComponent(ch), { headers: { 'Client-Id': t.id, Authorization: 'Bearer ' + t.token } });
    if (r.status === 401) { tw.exp = 0; throw new Error('twitch auth expired'); }
    const j = await r.json(), u = (j.data || [])[0];
    const type = u ? String(u.broadcaster_type || '') : '';
    const v = { tier: type === 'affiliate' || type === 'partner' ? 'earner' : 'standard', type, found: !!u };
    tierCache.set(ch, { at: Date.now(), v }); return v;
  }

  // ---- Allies: the owner's friends list (users/{owner}/friends) gets "Match my game" free ----
  // friend code -> accounts/friend_codes/{CODE} -> user key -> users/{key}/twitch_username
  // Kept as a set of lower-case Twitch names, rebuilt at most every 10 minutes.
  let allies = { at: 0, set: new Set() };
  async function allyChannels() {
    if (Date.now() - allies.at < 10 * 60000) return allies.set;
    const owner = process.env.DISCORD_APP_OWNER_KEY, db = admin.database(), set = new Set();
    try {
      const keys = new Set(owner ? [owner] : []);
      const friends = owner ? (await db.ref('users/' + owner + '/friends').once('value')).val() || {} : {};
      await Promise.all(Object.keys(friends).map(async code => {
        const f = friends[code] || {}, c = String(f.friend_code || code).toUpperCase();
        const k = (await db.ref('accounts/friend_codes/' + c).once('value')).val();
        if (typeof k === 'string' && k) keys.add(k);
      }));
      await Promise.all([...keys].map(async k => {
        const t = cleanChan((await db.ref('users/' + k + '/twitch_username').once('value')).val() || '');
        if (okChan(t)) set.add(t);
      }));
      allies = { at: Date.now(), set };
    } catch (e) { console.error('[overlay allies]', e && e.message); }
    return allies.set;
  }

  // /overlay/pro/:name?platform=twitch|youtube|kick
  //   -> { pro, until, tier (0-3), lifetime, founder, ally, games, account }
  //   pro   = any paid tier (no watermark), kept for older overlays
  //   ally  = this Twitch channel belongs to the owner or someone on his friends list (Tier 3 free)
  //   games = "Match my game" is unlocked (paid pass OR ally)
  app.get('/overlay/pro/:channel', async (req, res) => {
    cors(req, res);
    const a = account(req.query.platform, req.params.channel); if (!a) return res.json({ pro: false, tier: 0 });
    const hit = proCache.get(a.id); if (hit && Date.now() - hit.at < 5 * 60000) return res.json(hit.body);
    try {
      const d = await fs().collection('overlay_pro').doc(a.id).get();
      let ally = false; if (a.platform === 'twitch') { try { ally = (await allyChannels()).has(a.name); } catch (e) { /* keep false */ } }
      const paid = T.effectiveTier(d.exists ? d.data() : null, Date.now(), false), eff = ally && paid.tier < 3 ? T.effectiveTier(null, 0, true) : paid;
      const body = { pro: paid.tier >= 1, until: paid.lifetime ? LIFETIME_UNTIL : paid.until, tier: eff.tier, lifetime: paid.lifetime, founder: paid.founder,
        account: a.label, ally, games: paid.tier >= 1 || ally };
      proCache.set(a.id, { at: Date.now(), body }); res.json(body);
    } catch (e) { console.error('[overlay pro]', e && e.message); res.json({ pro: false, tier: 0 }); }
  });

  async function founderLeft() {
    try { const m = await fs().collection('ext_meta').doc('founders').get(); return Math.max(0, T.FOUNDER_LIMIT - Number((m.exists && m.data().taken) || 0)); } catch (e) { return 0; }
  }
  // /overlay/plans?channel&platform -> { tiers, founderLeft, current: { tier, lifetime, until }, lifetimePaid, found }
  app.get('/overlay/plans', async (req, res) => {
    cors(req, res);
    const a = account(req.query.platform, req.query.channel); let found = !!a;
    if (a && a.platform === 'twitch') { try { found = (await channelTier(a.name)).found; } catch (e) { console.error('[overlay tier]', e && e.message); return res.status(502).json({ error: 'Could not check that channel with Twitch. Try again.' }); } }
    let doc = null; if (a) { try { const d = await fs().collection('overlay_pro').doc(a.id).get(); doc = d.exists ? d.data() : null; } catch (e) {} }
    const cur = T.effectiveTier(doc, Date.now(), false);
    res.json({ provider: 'bmc', currency: CURRENCY, tiers: T.TIERS, founderLeft: await founderLeft(), found,
      platform: a ? a.platform : '', account: a ? a.label : '', current: cur, lifetimePaid: (doc && doc.lifetimePaid) || '0.00' });
  });

  // ---- used by bmc.js (Buy Me a Coffee) ----
  // quote(platform, channel, tier 1-3, term month|year|lifetime|founder) -> { id, label, tier, term, days, name, price } | { error }
  async function quote(platform, channel, tier, term) {
    const a = account(platform, channel);
    tier = Number(tier);
    if (!a) return { error: 'Type your streaming username first.' };
    if (!T.okTier(tier)) return { error: 'Pick Tier 1, 2 or 3.' };
    if (!T.okTerm(term)) return { error: 'Pick monthly, yearly or lifetime.' };
    if (a.platform === 'twitch') {
      let info; try { info = await channelTier(a.name); } catch (e) { console.error('[overlay tier]', e && e.message); return { status: 502, error: 'Could not check your channel with Twitch. Try again.' }; }
      if (!info.found) return { error: 'Couldn’t find twitch.tv/' + a.name + ' - check the spelling.' };
    }
    const d = await fs().collection('overlay_pro').doc(a.id).get(), doc = d.exists ? d.data() : null;
    const has = T.effectiveTier(doc, Date.now(), false);
    if ((term === 'lifetime' || term === 'founder') && has.lifetime && has.tier >= tier) return { error: 'You already have lifetime at this tier or higher.' };
    const price = T.priceFor(tier, term, doc);
    return { id: a.id, label: a.label, tier, term, days: T.TERM_DAYS[term] || 0, name: 'Werewolf ' + T.TIER_NAME[tier] + ' - ' + T.TERM_NAME[term] + ' for ' + a.label, price };
  }
  // grantPass(account, tier, term, ref, payer, { agreement, paid }) -> until (LIFETIME_UNTIL for lifetime)
  //   month/year add time to THAT tier (time left on other tiers is kept); lifetime/founder mark the tier lifetime.
  async function grantPass(ch, tier, term, ref, payer, extra) {
    tier = Number(tier); extra = extra || {};
    if (!okId(ch) || !T.okTier(tier) || !T.okTerm(term)) throw new Error('bad pass');
    const doc = fs().collection('overlay_pro').doc(ch);
    const until = await fs().runTransaction(async t => {
      const cur = await t.get(doc), d = cur.exists ? cur.data() : {};
      const tiers = d.tiers || (Number(d.until) ? { 1: { until: Number(d.until) } } : {});
      const patch = { channel: ch, platform: ch.indexOf(':') > 0 ? ch.split(':')[0] : 'twitch', name: ch.split(':').pop(), payer: payer || '', updated: Date.now(), orders: (d.orders || []).concat(ref).slice(-50) };
      if (term === 'lifetime' || term === 'founder') {
        tiers[tier] = { lifetime: true, founder: term === 'founder' };
        patch.lifetimePaid = T.money(parseFloat(d.lifetimePaid || 0) + parseFloat(extra.paid || 0));
        if (extra.agreement) patch.agreement = extra.agreement;
      } else {
        const old = tiers[tier] || {}, add = T.TERM_DAYS[term] * DAY;
        if (!old.lifetime) tiers[tier] = { until: Math.max(Date.now(), Number(old.until || 0)) + add };
        // time left on lower tiers is kept: it starts counting again after this higher tier's time
        Object.keys(tiers).forEach(function (k) { const e = tiers[k]; if (Number(k) < tier && e && !e.lifetime && Number(e.until) > Date.now()) e.until = Number(e.until) + add; });
      }
      patch.tiers = tiers;
      const eff = T.effectiveTier({ tiers }, Date.now(), false);
      patch.until = eff.lifetime ? LIFETIME_UNTIL : eff.until;   // for older readers
      patch.tier = eff.tier;
      t.set(doc, patch, { merge: true });
      return patch.until;
    });
    proCache.delete(ch);
    return until;
  }
  return { quote, grantPass };
}
module.exports = { mountOverlayPro };
