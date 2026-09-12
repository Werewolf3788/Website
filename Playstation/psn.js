/* ============================================================================
 * File: psn.js
 * Location: /Playstation/psn.js
 * Description: Squad Pack Sync Engine - Staggered 24-Hr Heavy Audits & 10m Light Cadence
 * Squad Heavy Schedule (Chicago Time):
 *   - WildHorse_Spirit: 22:00 - 22:59
 *   - OneLIVIDMAN:      04:00 - 04:59
 *   - DesdemonaTiger:   12:00 - 12:59
 *   - Darkwing69420:    16:00 - 16:59
 * Version: 22.0.0 - Staggered Time-Window Execution
 * Date & Time Stamp: 2026-09-07 20:45:00 (24hr Chicago Time)
 * ============================================================================ */

// Staggered 24-hour heavy audit windows (24-hour format in Chicago Time)
const HEAVY_SCHEDULE_HOURS = {
    wildhorse_spirit: 22, // 10:00 PM CDT
    ray: 4,               // 04:00 AM CDT
    marc: 12,             // 12:00 PM CDT
    darkwing: 16          // 04:00 PM CDT
};

/**
/* ============================================================================
 * File: psn.js
 * Location: /Playstation/psn.js
 * Description: Squad Pack Sync Engine - Staggered 24-Hr Heavy Audits & 10m Light Cadence
 * Squad Heavy Schedule (Chicago Time):
 *   - wildhorse_spirit: 22:00 - 22:59
 *   - onelividman:      04:00 - 04:59
 *   - desdemonatiger:   12:00 - 12:59
 *   - darkwing69420:    16:00 - 16:59
 * Version: 22.1.0 - Staggered Time-Window Execution Bug Fix
 * Date & Time Stamp: 2026-09-11 23:09:00 (24hr New York Time)
 * ============================================================================ */

// SECTION: Staggered 24-hour heavy audit windows (Standardized Gamertags in Chicago Time)
const HEAVY_SCHEDULE_HOURS = {
    wildhorse_spirit: 22, // 10:00 PM CDT / CST
    onelividman: 4,       // 04:00 AM CDT / CST
    desdemonatiger: 12,   // 12:00 PM CDT / CST
    darkwing69420: 16     // 04:00 PM CDT / CST
};

/**
 * Extracts exact 24-hour integer directly in America/Chicago timezone
 * without re-parsing into the host system's local clock.
 */
function getChicagoHour() {
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Chicago",
        hour: "numeric",
        hourCycle: "h23" // Guarantees 0-23 integer representation
    });
    return parseInt(formatter.format(new Date()), 10);
}

/**
 * Checks if the current hour matches the designated heavy audit window for the user,
 * and confirms it hasn't already run in this exact 24-hour cycle.
 * 
 * @param {string} userKey - The gamertag of the squad member (case-insensitive)
 * @param {Object} existingData - Existing profile / tracking sync metadata from Firebase
 * @returns {boolean} - True if eligible for heavy sync execution
 */
function isUserHeavyWindow(userKey, existingData) {
    if (!userKey) return false;

    // Normalize gamertag to lowercase to avoid casing lookup mismatches
    const normalizedUserKey = String(userKey).trim().toLowerCase();
    const scheduledHour = HEAVY_SCHEDULE_HOURS[normalizedUserKey];

    // Gamertag not found in schedule or unassigned
    if (scheduledHour === undefined) return false;

    // Get current Chicago 24-hour mark (0 - 23)
    const currentHour = getChicagoHour();

    // Verify current Chicago hour matches scheduled window
    if (currentHour !== scheduledHour) return false;

    // Check if heavy sync was already done today during this window
    const lastHeavy = existingData?.lastHeavySyncTimestamp 
        ? new Date(existingData.lastHeavySyncTimestamp).getTime() 
        : 0;

    // Calculate hours passed since last execution
    const hoursSinceLast = (Date.now() - lastHeavy) / (1000 * 60 * 60);

    // Only run once inside the assigned 1-hour window (prevent duplicate heavy calls)
    return hoursSinceLast >= 20;
} * Checks if the current hour matches the designated heavy audit window for the user,
 * and confirms it hasn't already run in this exact 24-hour cycle.
 */
function isUserHeavyWindow(userKey, existingData) {
    const chicagoTimeStr = new Date().toLocaleString("en-US", { timeZone: "America/Chicago", hour12: false });
    const currentHour = new Date(chicagoTimeStr).getHours();
    const scheduledHour = HEAVY_SCHEDULE_HOURS[userKey];

    if (currentHour !== scheduledHour) return false;

    // Check if heavy sync was already done today during this window
    const lastHeavy = existingData?.lastHeavySyncTimestamp ? new Date(existingData.lastHeavySyncTimestamp).getTime() : 0;
    const hoursSinceLast = (Date.now() - lastHeavy) / (1000 * 60 * 60);

    return hoursSinceLast >= 20; // Only run once inside the assigned 1-hour window
}
