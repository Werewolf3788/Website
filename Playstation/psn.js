/* ============================================================================
 * File: psn.js
 * Location: /Playstation/psn.js
 * Description: Squad Pack Sync Engine - 3-Tier Multi-Cadence Architecture:
 *              1. Light Presence: Checks online state and active game (Runs on 15m cadence or manual)
 *              2. Targeted Trophy Delta: Updates trophy progress for the active title only
 *              3. Heavy Audit: 24-Hr Staggered scan to populate new global game skeletons
 * Protocol Support: Dynamic HTTP and HTTPS compatibility
 * Analytics & Tracking: Ready for GA4 (G-CTYHDF4MSD) deployment via GTM
 * Date & Time Stamp: 2026-09-12 01:05:00 (24hr New York Time)
 * ============================================================================ */

// Line 13: Staggered 24-hour heavy audit windows (Standardized Gamertags in Chicago Time)
const HEAVY_SCHEDULE_HOURS = {
    wildhorse_spirit: 22, // 10:00 PM CDT / CST
    onelividman: 4,       // 04:00 AM CDT / CST
    desdemonatiger: 12,   // 12:00 PM CDT / CST
    darkwing69420: 16     // 04:00 PM CDT / CST
};

/**
 * Line 23: Extracts exact 24-hour integer directly in America/Chicago timezone.
 * Used for scheduled heavy audit window evaluation.
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
 * Line 37: Determines if a heavy 24-hour audit should execute for a specific squad member.
 * Completely bypassed when manual workflow dispatch triggers.
 */
function shouldRunHeavyAudit(gamertag, existingSquadData, isManualRun = false) {
    if (isManualRun) return true;
    if (!gamertag) return false;

    const key = String(gamertag).trim().toLowerCase();
    const scheduledHour = HEAVY_SCHEDULE_HOURS[key];
    if (scheduledHour === undefined) return false;

    const currentChicagoHour = getChicagoHour();
    if (currentChicagoHour !== scheduledHour) return false;

    const lastHeavy = existingSquadData?.lastHeavySyncTimestamp 
        ? new Date(existingSquadData.lastHeavySyncTimestamp).getTime() 
        : 0;

    const hoursSinceLast = (Date.now() - lastHeavy) / (1000 * 60 * 60);
    return hoursSinceLast >= 20; // Enforce single heavy run per daily window
}

/**
 * Line 61: Parses PSN API basic presence packet into uniform squad structure.
 * Normalizes online status, active titles, and hardware platform.
 */
function parsePresence(presenceRaw) {
    const basic = presenceRaw?.basicPresence || presenceRaw || {};
    const isOnline = basic.availability === "availableToPlay" ||
                     basic.primaryPlatformInfo?.onlineStatus === "online";

    const gameInfo = basic.gameTitleInfoList?.[0] || null;
    const activeTitleName = gameInfo?.titleName || null;
    const activeNpCommunicationId = gameInfo?.npCommunicationId || gameInfo?.npTitleId || null;
    const platform = basic.primaryPlatformInfo?.platform || "PS5";

    return {
        online: Boolean(isOnline),
        statusText: isOnline ? (activeTitleName ? `Playing ${activeTitleName}` : "Online") : "Offline",
        activeTitleName: activeTitleName,
        activeNpCommunicationId: activeNpCommunicationId,
        platform: platform,
        lastChecked: new Date().toISOString()
    };
}

/**
 * Line 86: Core Squad Member Sync Engine.
 * Handles Light Presence, Targeted Game Deltas, and Shared Game Skeleton storage.
 */
async function syncSquadMember({ gamertag, psnClient, firebaseDb, isManualRun = false }) {
    const key = String(gamertag).trim().toLowerCase();

    // Step 1: Read existing squad member metadata from Realtime Database (RTDB)
    const squadSnap = await firebaseDb.ref(`squad/${key}`).once("value");
    const squadData = squadSnap.val() || {};

    // Step 2: LIGHT CADENCE - Always query presence for live dashboard display
    const rawPresence = await psnClient.getPresence(key);
    const presence = parsePresence(rawPresence);

    const updates = {};
    updates[`squad/${key}/presence`] = presence;
    updates[`squad/${key}/lastSeen`] = presence.online 
        ? new Date().toISOString() 
        : (squadData.lastSeen || new Date().toISOString());

    // Step 3: TARGETED ACTIVE GAME CHECK
    // If active and playing, update the active pointer and sync earned trophies
    if (presence.online && presence.activeNpCommunicationId) {
        const commId = presence.activeNpCommunicationId;
        updates[`squad/${key}/activeGameId`] = commId;

        // Verify if global game skeleton exists in shared database storage
        const skeletonSnap = await firebaseDb.ref(`games/${commId}`).once("value");
        const skeletonExists = skeletonSnap.exists();

        if (!skeletonExists) {
            // Pull full game skeleton once for the entire squad
            const titleDetails = await psnClient.getTitleDetails(commId);
            const titleTrophyList = await psnClient.getTitleTrophies(commId);

            updates[`games/${commId}/meta`] = {
                titleName: presence.activeTitleName,
                platform: presence.platform,
                iconUrl: titleDetails.iconUrl || "",
                totalTrophies: titleTrophyList.length,
                lastUpdated: new Date().toISOString()
            };
            updates[`games/${commId}/skeleton`] = titleTrophyList; // Universal trophy definitions
        }

        // Pull ONLY the earned status delta for this user on the active game
        const earnedTrophies = await psnClient.getUserTitleTrophies(key, commId);
        updates[`squad/${key}/titles/${commId}/earned`] = earnedTrophies;
        updates[`squad/${key}/titles/${commId}/lastUpdated`] = new Date().toISOString();
    } else {
        // Clear or retain idle game flag
        updates[`squad/${key}/activeGameId`] = presence.online ? "IDLE_MENUS" : "OFFLINE";
    }

    // Step 4: HEAVY CADENCE - 24-Hour Staggered Scan (or Manual Trigger)
    const runHeavy = shouldRunHeavyAudit(key, squadData, isManualRun);
    if (runHeavy) {
        const fullLibrary = await psnClient.getUserTitles(key);
        updates[`squad/${key}/library`] = fullLibrary;
        updates[`squad/${key}/lastHeavySyncTimestamp`] = new Date().toISOString();
    }

    // Step 5: Atomic multi-path write across HTTP/HTTPS
    await firebaseDb.ref().update(updates);

    return {
        gamertag: key,
        online: presence.online,
        activeTitle: presence.activeTitleName,
        heavySyncExecuted: runHeavy
    };
}

// Line 162: Export module for GitHub Actions Node runner
if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        HEAVY_SCHEDULE_HOURS,
        getChicagoHour,
        shouldRunHeavyAudit,
        parsePresence,
        syncSquadMember
    };
}
