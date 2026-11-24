/* Werewolf3788 Social Cards - StreamElements Custom Widget (JS tab)
 * Chat messages -> tweet-style glass cards (avatar, name, @handle, emotes, platform tag).
 * Follows / subs / gifts / bits / tips / raids / redemptions -> phone-notification cards.
 * Chat relayed from YouTube / TikTok / Kick by the stream sync bot ("[YT] name: text")
 * is shown as that person's own card with a YouTube / TikTok / Kick tag.
 * The bot account (modem3788) is shown too, with a glowing "verified" style. */
let F = {};                 // field data from StreamElements
const avatarCache = {};     // login -> avatar url

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const lower = (s) => String(s || '').toLowerCase().trim();
const listOf = (s) => String(s || '').split(',').map(lower).filter(Boolean);

window.addEventListener('onWidgetLoad', (obj) => {
  F = obj.detail.fieldData || {};
  const box = document.getElementById('cards');
  if (F.side === 'right') box.classList.add('right');
});

window.addEventListener('onEventReceived', (obj) => {
  const d = obj.detail || {};
  const listener = d.listener || '';
  const ev = d.event || {};
  if (listener === 'message') return onChat(ev.data || {});
  if (listener === 'delete-message') return removeByMsgId(ev.msgId);
  if (listener === 'delete-messages') return removeByUser(ev.userId);
  if (ev.itemId !== undefined) return alertCard('redemption', 'Channel points', ev.name, ev.message ? `redeemed ${ev.message}` : 'redeemed a reward');
  const kind = listener.split('-')[0];
  const amt = Number(ev.amount) || 0;
  if (kind === 'follower' && F.showFollows !== false) return alertCard('follower', 'New follower', ev.name, 'just followed 💜');
  if (kind === 'subscriber' && F.showSubs !== false) {
    if (ev.bulkGifted) return alertCard('sub', 'Gift subs', ev.sender || ev.name, `gifted ${amt} subs 🎁`);
    if (ev.gifted) return alertCard('sub', 'Gift sub', ev.name, `got a sub from ${ev.sender || 'someone'} 🎁`);
    return alertCard('sub', 'New subscriber', ev.name, amt > 1 ? `subscribed for ${amt} months 🎉` : 'just subscribed 🎉');
  }
  if (kind === 'cheer' && F.showCheers !== false) return alertCard('cheer', 'Bits', ev.name, `cheered ${amt.toLocaleString()} bits 💎`);
  if (kind === 'tip' && F.showTips !== false) return alertCard('tip', 'Tip', ev.name, `tipped $${amt.toFixed(2)} 💵`);
  if (kind === 'raid' && F.showRaids !== false) return alertCard('raid', 'Raid', ev.name, `is raiding with ${amt} viewers 🚀`);
});

/* ---------- chat ---------- */
function onChat(m) {
  if (F.showChat === false) return;
  let text = String(m.text || '');
  if (!text) return;
  const login = lower(m.nick || m.displayName);
  if (listOf(F.ignoreUsers).includes(login)) return;
  if (text.startsWith('!') && F.hideCommands !== false) return;

  const bot = lower(F.botName || 'modem3788');
  let name = m.displayName || m.nick || 'viewer', handle = '@' + (m.nick || login), src = 'twitch', srcLabel = 'TWITCH';
  let isBot = login === bot, emotes = m.emotes || [], color = m.displayColor || '';

  // Relayed chat from the stream sync bot: "[YT] Name: message"
  const relay = text.match(/^\[(YT|TT|KICK)\]\s*([^:]{1,40}):\s*([\s\S]*)$/i);
  if (relay) {
    const tag = relay[1].toUpperCase();
    src = { YT: 'yt', TT: 'tt', KICK: 'kick' }[tag];
    srcLabel = { YT: 'YOUTUBE', TT: 'TIKTOK', KICK: 'KICK' }[tag];
    name = relay[2].trim(); handle = 'via ' + srcLabel.toLowerCase(); text = relay[3];
    isBot = false; emotes = []; color = '';
  } else if (isBot) { src = 'bot'; srcLabel = 'BOT'; }

  const avId = 'av' + Math.random().toString(36).slice(2);
  const badges = (m.badges || []).slice(0, 3).map((b) => `<img class="badge" src="${esc(b.url)}" alt="">`).join('');
  const html = `
    <div class="tw-head">
      <img class="tw-av" id="${avId}" src="${esc(placeholderAvatar(name))}" alt="">
      <div class="tw-who">
        <div class="tw-name" style="${color ? `color:${esc(color)}` : ''}">${esc(name)}${isBot ? ' <span class="verified">✓</span>' : ''}${badges}</div>
        <div class="tw-handle">${esc(handle)} · now</div>
      </div>
      <span class="tw-src ${src}">${srcLabel}</span>
    </div>
    <div class="tw-text">${withEmotes(text, emotes)}</div>
    <div class="tw-foot"><span>💬</span><span>🔁</span><span>♡</span></div>`;
  const card = addCard('card' + (isBot ? ' bot' : ''), html, { msgId: m.msgId, userId: m.userId });
  if (src === 'twitch' || src === 'bot') loadAvatar(login, avId);
}

function withEmotes(text, emotes) {
  let out = esc(text);
  (emotes || []).forEach((e) => {
    if (!e || !e.name || !e.urls) return;
    const url = e.urls['2'] || e.urls['1'] || Object.values(e.urls)[0];
    const re = new RegExp(`(^|\\s)${esc(e.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=\\s|$)`, 'g');
    out = out.replace(re, `$1<img class="emote" src="${esc(url)}" alt="${esc(e.name)}">`);
  });
  return out;
}

function placeholderAvatar(name) {
  const ch = esc((String(name).trim()[0] || '?').toUpperCase());
  return `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='40' height='40'><rect width='40' height='40' rx='20' fill='%23334155'/><text x='50%' y='58%' font-family='sans-serif' font-size='18' font-weight='bold' fill='white' text-anchor='middle'>${ch}</text></svg>`;
}

function loadAvatar(login, imgId) {
  if (!login) return;
  const set = (url) => { const el = document.getElementById(imgId); if (el && url) el.src = url; };
  if (avatarCache[login]) return set(avatarCache[login]);
  fetch(`https://decapi.me/twitch/avatar/${encodeURIComponent(login)}`)
    .then((r) => r.text())
    .then((t) => { t = t.trim(); if (/^https:\/\//.test(t)) { avatarCache[login] = t; set(t); } })
    .catch(() => {});
}

/* ---------- alerts ---------- */
function alertCard(kind, app, name, action) {
  if (F.showAlerts === false) return;
  const icon = { follower: '💜', sub: '⭐', cheer: '💎', tip: '💵', raid: '🚀', redemption: '🎯' }[kind] || '🔔';
  const html = `
    <div class="ph-row">
      <div class="ph-icon">${icon}</div>
      <div style="min-width:0">
        <div class="ph-app">${esc(app)}</div>
        <div class="ph-title">${esc(name || 'Someone')}</div>
        <div class="ph-sub">${esc(action)}</div>
      </div>
      <div class="ph-time">now</div>
    </div>`;
  addCard('card phone ' + kind, html, {}, Number(F.alertSeconds) || 12);
}

/* ---------- stack ---------- */
function addCard(cls, inner, data, seconds) {
  const box = document.getElementById('cards');
  const el = document.createElement('div');
  el.className = cls; el.innerHTML = inner;
  if (data.msgId) el.dataset.msgId = data.msgId;
  if (data.userId) el.dataset.userId = data.userId;
  box.prepend(el);
  const max = Number(F.maxCards) || 5;
  [...box.children].slice(max).forEach(leave);
  const life = (seconds || Number(F.chatSeconds) || 25) * 1000;
  if (life > 0) setTimeout(() => leave(el), life);
  return el;
}
function leave(el) { if (!el || el.classList.contains('leaving')) return; el.classList.add('leaving'); setTimeout(() => el.remove(), 520); }
function removeByMsgId(id) { document.querySelectorAll(`#cards [data-msg-id="${CSS.escape(String(id || ''))}"]`).forEach(leave); }
function removeByUser(id) { document.querySelectorAll(`#cards [data-user-id="${CSS.escape(String(id || ''))}"]`).forEach(leave); }
