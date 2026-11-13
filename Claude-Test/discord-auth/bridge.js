/* ============================================================================
 * Discord server bridge for the site messenger ("Discord" pill in ww-social.js)
 *
 *   POST /bridge/channels  { idToken }                 -> { guild, channels:[{id,name}] }
 *   POST /bridge/messages  { idToken, channel, after } -> { messages:[...] }
 *   POST /bridge/send      { idToken, channel, text }  -> { ok:true }
 *
 * Who may use it: a signed-in site user whose account has Discord linked AND who is a
 * member of the bridged Discord server. Only channels the bot itself can read are shown.
 * No always-on gateway connection: the site asks, the server calls Discord's REST API
 * (short cache), so it works on a host that sleeps when idle.
 *
 * Bot token:  env DISCORD_BOT_TOKEN, else Firebase user_secrets/{DISCORD_APP_OWNER_KEY}/discord_bot_token
 * Server:     Firebase discord_bridge/invite (invite code), else env DISCORD_BRIDGE_INVITE
 * In the Discord Developer Portal the bot needs the "Message Content Intent" switched on;
 * in the server it needs View Channels, Read Message History, Send Messages, Manage Webhooks.
 * ========================================================================== */
'use strict';
const API = 'https://discord.com/api/v10';
const TEXT_TYPES = [0, 5];

function mountBridge(app, { admin, fetchFn, cors }) {
  const db = () => admin.database();
  const cache = { token: { v: '', at: 0 }, guild: null, guildAt: 0, chans: null, chansAt: 0, members: new Map(), msgs: new Map(), hooks: new Map(), lastSend: new Map() };

  async function botToken() {
    if (process.env.DISCORD_BOT_TOKEN) return process.env.DISCORD_BOT_TOKEN.trim();
    if (cache.token.v && Date.now() - cache.token.at < 300000) return cache.token.v;
    const key = process.env.DISCORD_APP_OWNER_KEY; if (!key) return '';
    const v = String((await db().ref('user_secrets/' + key + '/discord_bot_token').once('value')).val() || '').trim();
    cache.token = { v, at: Date.now() }; return v;
  }
  async function dapi(path, opts) {
    const tok = await botToken(); if (!tok) return { status: 0, json: null };
    const o = Object.assign({ headers: {} }, opts || {});
    if (!o.noAuth) o.headers.Authorization = 'Bot ' + tok;
    if (o.body) o.headers['Content-Type'] = 'application/json';
    const r = await fetchFn(API + path, o); let j = null; try { j = await r.json(); } catch (e) {}
    return { status: r.status, json: j };
  }
  async function guild() {
    if (cache.guild && Date.now() - cache.guildAt < 3600000) return cache.guild;
    let code = ''; try { code = String((await db().ref('discord_bridge/invite').once('value')).val() || ''); } catch (e) {}
    code = (code || process.env.DISCORD_BRIDGE_INVITE || '').trim().replace(/^.*\//, '');
    if (!/^[A-Za-z0-9-]{2,32}$/.test(code)) return null;
    const r = await fetchFn(API + '/invites/' + code); const j = r.ok ? await r.json() : null;
    if (!j || !j.guild) return null;
    cache.guild = { id: j.guild.id, name: j.guild.name, invite: 'https://discord.gg/' + code, icon: j.guild.icon ? `https://cdn.discordapp.com/icons/${j.guild.id}/${j.guild.icon}.png?size=64` : '' };
    cache.guildAt = Date.now(); return cache.guild;
  }
  // -> { ok, uid, name, avatar } or { error, code }
  async function who(idToken) {
    let uid; try { uid = (await admin.auth().verifyIdToken(String(idToken || ''))).uid; } catch (e) { return { code: 401, error: 'signin' }; }
    if (!(await botToken())) return { code: 503, error: 'nobot' };
    const g = await guild(); if (!g) return { code: 503, error: 'noserver' };
    const link = (await db().ref('auth_links/' + uid + '/discord').once('value')).val();
    if (!link || !link.id) return { code: 403, error: 'notlinked' };
    const hit = cache.members.get(uid);
    if (hit && hit.did === link.id && Date.now() - hit.at < 600000) return hit.ok ? hit : { code: 403, error: 'notmember', invite: g.invite, guild: g.name };
    const m = await dapi(`/guilds/${g.id}/members/${link.id}`);
    if (m.status === 401 || m.status === 403) return { code: 503, error: 'botnotin', invite: g.invite, guild: g.name };
    const ok = m.status === 200 && m.json && m.json.user;
    const u = ok ? m.json.user : {};
    const rec = { ok: !!ok, at: Date.now(), uid, did: link.id, name: ok ? (m.json.nick || u.global_name || u.username || link.username) : '', avatar: ok && u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=64` : (link.avatar || '') };
    cache.members.set(uid, rec);
    return rec.ok ? rec : { code: 403, error: 'notmember', invite: g.invite, guild: g.name };
  }
  async function channels() {
    if (cache.chans && Date.now() - cache.chansAt < 600000) return cache.chans;
    const g = await guild(); const r = await dapi(`/guilds/${g.id}/channels`);
    if (r.status !== 200 || !Array.isArray(r.json)) return [];
    const cats = {}; r.json.filter(c => c.type === 4).forEach(c => { cats[c.id] = c.position; });
    const list = r.json.filter(c => TEXT_TYPES.includes(c.type)).sort((a, b) => ((cats[a.parent_id] ?? -1) - (cats[b.parent_id] ?? -1)) || (a.position - b.position));
    const out = [];
    for (let i = 0; i < list.length; i += 5) {          // keep only what the bot can actually read
      const part = await Promise.all(list.slice(i, i + 5).map(async c => ((await dapi(`/channels/${c.id}/messages?limit=1`)).status === 200 ? { id: c.id, name: c.name } : null)));
      part.forEach(c => { if (c) out.push(c); });
    }
    cache.chans = out; cache.chansAt = Date.now(); return out;
  }
  const clean = (m) => {
    let text = String(m.content || '');
    (m.mentions || []).forEach(u => { text = text.split('<@' + u.id + '>').join('@' + (u.global_name || u.username)).split('<@!' + u.id + '>').join('@' + (u.global_name || u.username)); });
    text = text.replace(/<a?:(\w+):\d+>/g, ':$1:');
    const a = m.author || {};
    return {
      id: m.id, ts: Date.parse(m.timestamp) || 0, did: a.id || '', bot: !!a.bot && !m.webhook_id, hook: !!m.webhook_id,
      name: (m.member && m.member.nick) || a.global_name || a.username || 'Someone',
      avatar: a.avatar ? `https://cdn.discordapp.com/avatars/${a.id}/${a.avatar}.png?size=64` : '',
      text: text.slice(0, 4000),
      files: (m.attachments || []).slice(0, 6).map(f => ({ url: f.url, name: f.filename, img: /^image\//.test(f.content_type || '') })),
      embeds: (m.embeds || []).filter(e => e.title || e.description).slice(0, 3).map(e => ({ title: e.title || '', text: String(e.description || '').slice(0, 500), url: e.url || '' }))
    };
  };
  async function messages(ch) {
    const hit = cache.msgs.get(ch);
    if (hit && Date.now() - hit.at < 2500) return hit.list;
    const r = await dapi(`/channels/${ch}/messages?limit=50`);
    if (r.status !== 200 || !Array.isArray(r.json)) return hit ? hit.list : [];
    const list = r.json.map(clean).reverse(); cache.msgs.set(ch, { list, at: Date.now() }); return list;
  }
  async function hook(ch) {
    if (cache.hooks.has(ch)) return cache.hooks.get(ch);
    let h = null; const r = await dapi(`/channels/${ch}/webhooks`);
    if (r.status === 200 && Array.isArray(r.json)) h = r.json.find(w => w.token && w.name === 'Pack Hub');
    if (!h && r.status === 200) { const c = await dapi(`/channels/${ch}/webhooks`, { method: 'POST', body: JSON.stringify({ name: 'Pack Hub' }) }); if (c.status === 200 && c.json && c.json.token) h = c.json; }
    const v = h ? { id: h.id, token: h.token } : null; cache.hooks.set(ch, v); return v;
  }
  const guard = (fn) => async (req, res) => {
    cors(req, res);
    try {
      const w = await who(req.body && req.body.idToken);
      if (!w.ok) return res.status(w.code || 403).json({ error: w.error, invite: w.invite || '', guild: w.guild || '' });
      await fn(req, res, w);
    } catch (e) { console.error('[bridge]', e && e.message); res.status(500).json({ error: 'server' }); }
  };

  app.post('/bridge/channels', guard(async (_req, res, w) => { const g = await guild(); res.json({ guild: { name: g.name, icon: g.icon, invite: g.invite }, me: { name: w.name, did: w.did }, channels: await channels() }); }));
  app.post('/bridge/messages', guard(async (req, res) => {
    const ch = String(req.body.channel || ''); if (!(await channels()).some(c => c.id === ch)) return res.status(404).json({ error: 'nochannel' });
    let list = await messages(ch); const after = String(req.body.after || '');
    if (/^\d{5,25}$/.test(after)) { const a = BigInt(after); list = list.filter(m => BigInt(m.id) > a); }
    res.json({ messages: list });
  }));
  app.post('/bridge/send', guard(async (req, res, w) => {
    const ch = String(req.body.channel || ''), text = String(req.body.text || '').trim().slice(0, 1500);
    if (!text) return res.status(400).json({ error: 'empty' });
    if (!(await channels()).some(c => c.id === ch)) return res.status(404).json({ error: 'nochannel' });
    if (Date.now() - (cache.lastSend.get(w.uid) || 0) < 1000) return res.status(429).json({ error: 'slow' });
    cache.lastSend.set(w.uid, Date.now());
    const none = { parse: [] };                         // never ping @everyone / roles / users from the site
    let sent = false; const h = await hook(ch);
    if (h) {
      const r = await dapi(`/webhooks/${h.id}/${h.token}?wait=true`, { method: 'POST', noAuth: true, body: JSON.stringify({ content: text, username: String(w.name || 'Pack Hub').replace(/discord|clyde/ig, 'd•').slice(0, 80), avatar_url: w.avatar || undefined, allowed_mentions: none }) });
      sent = r.status === 200; if (!sent) cache.hooks.delete(ch);
    }
    if (!sent) { const r = await dapi(`/channels/${ch}/messages`, { method: 'POST', body: JSON.stringify({ content: ('**' + w.name + '**: ' + text).slice(0, 2000), allowed_mentions: none }) }); sent = r.status === 200; }
    cache.msgs.delete(ch);
    if (!sent) return res.status(502).json({ error: 'cantsend' });
    res.json({ ok: true });
  }));
}
module.exports = { mountBridge };
