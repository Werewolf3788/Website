// ============================================================================
// Send queued game pushes to specific friends (for example: "Kevin's Power Plant hit level 8" to his Tile Survival allies).
// Run by .github/workflows/ally-push.yml every ~10 minutes (and from the Actions tab).
//   Queue:          RTDB accounts/push_queue/{id} = { from, fromCode, to: [friend codes], title, body, url, tag, at }
//   Who is who:     accounts/friend_codes/{CODE} -> the owner's user key
//   Where to send:  accounts/push_subscriptions/{id} = { endpoint, keys, user }   (user is added by assets/ww-shell.js)
// Each queued item is deleted once handled. Items older than a day are dropped without sending.
// Needs secrets: VAPID_PRIVATE_KEY, and GCP_SA_KEY_WEBSITE (or FIREBASE_AUTH_SECRET) to read the private nodes.
// ============================================================================
const RTDB = 'https://entertainment-71888-default-rtdb.firebaseio.com';
const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BImzeWS4nMqlBy1hSI2wO2h01QrcgFDTLgeIZgLlL2wLhuQjZv3hjiOH00NNfveG662KozG6s87gtfByPS7zgqA';
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const DAY = 24 * 60 * 60 * 1000;

async function authQuery() {
    const secret = (process.env.FIREBASE_AUTH_SECRET || '').trim();
    if (secret) return `?auth=${encodeURIComponent(secret)}`;
    const raw = (process.env.GCP_SA_KEY_WEBSITE || '').trim();
    if (!raw) { console.warn('No GCP_SA_KEY_WEBSITE / FIREBASE_AUTH_SECRET: reading without login'); return ''; }
    const { JWT } = require('google-auth-library');
    const creds = raw.startsWith('{') ? JSON.parse(raw) : JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'));
    const client = new JWT({ email: creds.client_email, key: String(creds.private_key).replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/firebase.database'] });
    const { access_token } = await client.authorize();
    return `?access_token=${encodeURIComponent(access_token)}`;
}
const keyOfEmail = e => String(e).trim().toLowerCase().replace(/@/g, '_at_').replace(/\./g, '_');

async function main() {
    const AUTH = await authQuery();
    const get = async p => { const r = await fetch(`${RTDB}/${p}.json${AUTH}`); if (!r.ok) throw new Error(`GET ${p}: HTTP ${r.status}`); return r.json(); };
    const del = p => fetch(`${RTDB}/${p}.json${AUTH}`, { method: 'DELETE' });

    const queue = (await get('accounts/push_queue')) || {};
    const ids = Object.keys(queue);
    if (!ids.length) { console.log('Nothing queued.'); return; }
    if (!PRIVATE_KEY) { console.error('Missing VAPID_PRIVATE_KEY secret.'); process.exit(1); }
    const webpush = require('web-push');
    webpush.setVapidDetails('mailto:raykevin71888@gmail.com', PUBLIC_KEY, PRIVATE_KEY);

    const subs = (await get('accounts/push_subscriptions')) || {};
    const byUser = {};
    Object.keys(subs).forEach(id => { const s = subs[id]; if (s && s.user && s.endpoint && s.keys) (byUser[s.user] = byUser[s.user] || []).push({ id, s }); });

    const codeCache = {};
    async function userOfCode(code) {
        code = String(code || '').toUpperCase().replace(/[^A-Z0-9-]/g, '');
        if (!code) return null;
        if (code in codeCache) return codeCache[code];
        let v = null; try { v = await get(`accounts/friend_codes/${code}`); } catch (e) {}
        let key = null;
        if (typeof v === 'string') key = v.indexOf('@') > -1 ? keyOfEmail(v) : v;
        else if (v && typeof v === 'object') {
            for (const f of ['user_key', 'userKey', 'email_key', 'emailKey', 'key', 'owner', 'email', 'user']) if (typeof v[f] === 'string' && v[f]) { key = v[f].indexOf('@') > -1 ? keyOfEmail(v[f]) : v[f]; break; }
        }
        return (codeCache[code] = key);
    }

    let sent = 0, skipped = 0, removed = 0, failed = 0;
    for (const qid of ids) {
        const q = queue[qid] || {};
        if (!q.at || Date.now() - q.at > DAY) { await del(`accounts/push_queue/${qid}`); skipped++; continue; }
        const payload = JSON.stringify({ title: String(q.title || 'Werewolf Project').slice(0, 120), body: String(q.body || '').slice(0, 300), url: q.url || './', tag: q.tag || undefined });
        const done = new Set();
        for (const code of (Array.isArray(q.to) ? q.to : Object.values(q.to || {})).slice(0, 50)) {
            const user = await userOfCode(code); if (!user || done.has(user)) continue; done.add(user);
            for (const { id, s } of byUser[user] || []) {
                try { await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload, { TTL: 60 * 60 * 12 }); sent++; }
                catch (err) {
                    if (err.statusCode === 404 || err.statusCode === 410) { await del(`accounts/push_subscriptions/${id}`); removed++; }
                    else { failed++; console.warn(`Failed ${id}: ${err.statusCode || ''} ${err.body || err.message}`); }
                }
            }
        }
        await del(`accounts/push_queue/${qid}`);
    }
    console.log(`Queue items: ${ids.length} · pushes sent: ${sent} · old items dropped: ${skipped} · expired subscriptions removed: ${removed} · failed: ${failed}`);
}

main().catch(err => { console.error(err); process.exit(1); });
