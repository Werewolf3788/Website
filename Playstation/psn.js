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
 * Checks if the current hour matches the designated heavy audit window for the user,
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
