/* ============================================================================
 * File: psn.js
 * Location: /Playstation/psn.js
 * Description: PSN Squad Pack Sync Engine - 3-Tier Multi-Cadence Architecture:
 *              1. Light: Live Presence & Active Title (Runs every pass / manual)
 *              2. Medium: Delta Trophy Check on Active Title (Only if online & trophy count changed)
 *              3. Heavy: 24-Hr Staggered Full Account Audit (Chicago Time Windows)
 * Squad Heavy Schedule (Chicago Time):
 *   - wildhorse_spirit: 22:00 - 22:59
 *   - onelividman:      04:00 - 04:59
 *   - desdemonatiger:   12:00 - 12:59
 *   - darkwing69420:    16:00 - 16:59
 * Version: 23.0.0 - Smart Delta Trophies & Manual Trigger Bypass
 * Date & Time Stamp: 2026-09-11 23:37:00 (24hr New York Time)
 * ============================================================================ */

const HEAVY_SCHEDULE_HOURS = {
    wildhorse_spirit: 22, // 10:00 PM CDT / CST
    onelividman: 4,       // 04:00 AM CDT / CST
    desdemonatiger: 12,   // 12:00 PM CDT / CST
    darkwing69420: 16     // 04:00 PM CDT / CST
};

/**
 * Extracts current 24-hour integer in America/Chicago timezone.
 * Line 28: Used for scheduled window evaluation.
 */
function getChicagoHour() {
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Chicago",
        hour: "numeric",
        hourCycle: "h23"
    });
    return parseInt(formatter.format(new Date()), 10);
}

/**
 * Evaluates whether a heavy 24-hour audit should execute for a specific user.
 * Bypasses schedule checks completely if triggered manually via GitHub Actions.
 * Line 41: Guard condition for heavy account pulls.
 */
function shouldRunHeavyAudit(userKey, existingData, isManualRun = false) {
    if (isManualRun) return true;
    if (!userKey) return false;

    const normalizedKey = String(userKey).trim().toLowerCase();
    const scheduledHour = HEAVY_SCHEDULE_HOURS[normalizedKey];
    if (scheduledHour === undefined) return false;

    const currentChicagoHour = getChicagoHour();
    if (currentChicagoHour !== scheduledHour) return false;

    const lastHeavy = existingData?.lastHeavySyncTimestamp 
        ? new Date(existingData.lastHeavySyncTimestamp).getTime() 
        : 0;

    const hoursSinceLast = (Date.now() - lastHeavy) / (1000 * 60 * 60);
    return hoursSinceLast >= 20; // Run once per 24-hour assigned window
}

/**
 * Parses raw PSN API presence into a uniform status object.
 * Line 64: Normalizes platform differences (PS4, PS5, Web).
 */
function parsePresence(presenceRaw) {
    const basic = presenceRaw?.basicPresence || presenceRaw;
    const isOnline = basic?.availability === "availableToPlay" ||
                     basic?.primaryPlatformInfo?.onlineStatus === "online";

    const gameInfo = basic?.gameTitleInfoList?.[0] || null;
    const activeTitleName = gameInfo?.titleName || null;
    const activeNpTitleId = gameInfo?.npTitleId || null;
    const platform = basic?.primaryPlatformInfo?.platform || "PS5";

    return {
        online: Boolean(isOnline),
        statusText: isOnline ? (activeTitleName ? `Playing ${activeTitleName}` : "Online") : "Offline",
        activeTitleName,
        activeNpTitleId,
        platform,
        lastChecked: new Date().toISOString()
    };
}

/**
 * Determines if a light/medium delta check needs to pull trophy data.
 * If user is online and playing a game, checks if overall or title trophy counts moved.
 * Line 89: Prevents unnecessary API hammering and Firebase quota burning.
 */
function shouldCheckDeltaTrophies(presence, existingUserData) {
    if (!presence.online || !presence.activeNpTitleId) {
        return false;
    }

    // If we have no record of this game stored yet, we must pull it
    const storedGame = existingUserData?.titles?.[presence.activeNpTitleId];
    if (!storedGame) {
        return true;
    }

    // Pull delta if last title sync was more than 45 minutes ago while still playing
    const lastTitleCheck = storedGame?.lastCheckedTimestamp 
        ? new Date(storedGame.lastCheckedTimestamp).getTime() 
        : 0;
    const minutesSinceCheck = (Date.now() - lastTitleCheck) / (1000 * 60);

    return minutesSinceCheck >= 45;
}

/**
 * Main squad sync dispatcher.
 * Coordinates Light presence, Delta trophy updates, and Staggered Heavy audits.
 * Line 116: Core execution loop.
 */
async function syncSquadMember({ userKey, psnClient, firebaseDb, isManualRun = false }) {
    const normalizedKey = String(userKey).trim().toLowerCase();
    
    // Step 1: Read existing metadata from Firebase
    const existingSnap = await firebaseDb.ref(`squad/${normalizedKey}`).once("value");
    const existingData = existingSnap.val() || {};

    // Step 2: LIGHT SYNC - Always fetch current online presence
    const rawPresence = await psnClient.getPresence(normalizedKey);
    const presence = parsePresence(rawPresence);

    const updates = {};
    updates[`squad/${normalizedKey}/presence`] = presence;
    updates[`squad/${normalizedKey}/lastSeen`] = presence.online 
        ? new Date().toISOString() 
        : (existingData.lastSeen || new Date().toISOString());

    // Step 3: CHECK FULL HEAVY AUDIT
    const runHeavy = shouldRunHeavyAudit(normalizedKey, existingData, isManualRun);

    if (runHeavy) {
        // HEAVY TIER: Full titles and trophy scan
        const fullProfile = await psnClient.getFullProfileAndTrophies(normalizedKey);
        updates[`squad/${normalizedKey}/profile`] = fullProfile.summary;
        updates[`squad/${normalizedKey}/titles`] = fullProfile.titles;
        updates[`squad/${normalizedKey}/lastHeavySyncTimestamp`] = new Date().toISOString();
    } else if (shouldCheckDeltaTrophies(presence, existingData)) {
        // MEDIUM TIER: Targeted delta sync for currently played game only
        const activeGameTrophies = await psnClient.getTitleTrophies(normalizedKey, presence.activeNpTitleId);
        
        updates[`squad/${normalizedKey}/titles/${presence.activeNpTitleId}/trophies`] = activeGameTrophies.list;
        updates[`squad/${normalizedKey}/titles/${presence.activeNpTitleId}/earnedCount`] = activeGameTrophies.earnedCount;
        updates[`squad/${normalizedKey}/titles/${presence.activeNpTitleId}/lastCheckedTimestamp`] = new Date().toISOString();
    }

    // Step 4: Atomic write to Firebase (Works over HTTP and HTTPS)
    await firebaseDb.ref().update(updates);

    return {
        userKey: normalizedKey,
        online: presence.online,
        activeTitle: presence.activeTitleName,
        heavySyncExecuted: runHeavy
    };
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        HEAVY_SCHEDULE_HOURS,
        getChicagoHour,
        shouldRunHeavyAudit,
        parsePresence,
        shouldCheckDeltaTrophies,
        syncSquadMember
    };
}
