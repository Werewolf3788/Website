// ============================================================================
// Send a Web Push notification to everyone who turned notifications on.
// Run by .github/workflows/send-push.yml (Actions tab -> Send Push Notification)
// Subscribers are stored in Firebase RTDB /push_subscriptions by assets/ww-shell.js
// Needs secrets: VAPID_PRIVATE_KEY (and optionally VAPID_PUBLIC_KEY)
// ============================================================================
const webpush = require('web-push');

const RTDB = 'https://entertainment-71888-default-rtdb.firebaseio.com';
// Must match VAPID_PUBLIC_KEY in assets/ww-shell.js
const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BImzeWS4nMqlBy1hSI2wO2h01QrcgFDTLgeIZgLlL2wLhuQjZv3hjiOH00NNfveG662KozG6s87gtfByPS7zgqA';
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

async function main() {
    if (!PRIVATE_KEY) {
        console.error('Missing VAPID_PRIVATE_KEY secret. Add it under Settings -> Secrets and variables -> Actions.');
        process.exit(1);
    }
    webpush.setVapidDetails('mailto:raykevin71888@gmail.com', PUBLIC_KEY, PRIVATE_KEY);

    const payload = JSON.stringify({
        title: process.env.PUSH_TITLE || 'Werewolf Project',
        body: process.env.PUSH_BODY || '',
        url: process.env.PUSH_URL || './',
        image: process.env.PUSH_IMAGE || undefined,
        tag: process.env.PUSH_TAG || undefined
    });

    const res = await fetch(`${RTDB}/push_subscriptions.json`);
    if (!res.ok) throw new Error(`Could not read /push_subscriptions (HTTP ${res.status})`);
    const subs = (await res.json()) || {};
    const ids = Object.keys(subs);
    console.log(`Sending to ${ids.length} subscriber(s)...`);

    let sent = 0, removed = 0, failed = 0;
    for (const id of ids) {
        const s = subs[id];
        if (!s || !s.endpoint || !s.keys) continue;
        try {
            await webpush.sendNotification({ endpoint: s.endpoint, keys: s.keys }, payload, { TTL: 60 * 60 * 24 });
            sent++;
        } catch (err) {
            if (err.statusCode === 404 || err.statusCode === 410) {
                // The person turned notifications off or uninstalled: clean up
                await fetch(`${RTDB}/push_subscriptions/${id}.json`, { method: 'DELETE' });
                removed++;
            } else {
                failed++;
                console.warn(`Failed ${id}: ${err.statusCode || ''} ${err.body || err.message}`);
            }
        }
    }
    console.log(`Done. Sent: ${sent}, removed expired: ${removed}, failed: ${failed}`);
}

main().catch(err => { console.error(err); process.exit(1); });
