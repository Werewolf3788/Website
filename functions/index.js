// ==============================================================================
// PSN Trophy Poller - Cloud Function (v2 Scheduled Runner)
// Timestamp: 2026-09-07 17:42:23 EDT (New York)
// Trigger: Every 5 minutes via Cloud Scheduler
// ==============================================================================

const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const { 
  exchangeNpssoForCode, 
  exchangeCodeForAccessToken, 
  getUserTitles, 
  getUserTrophiesEarnedForTitle 
} = require("psn-api");

admin.initializeApp();
const db = admin.firestore();

exports.checkPsnTrophies = onSchedule({
  schedule: "every 5 minutes",
  timeZone: "America/New_York",
  retryCount: 1,
  maxInstances: 1
}, async (event) => {
  try {
    // 1. Fetch credentials and last saved state from Firestore
    const configRef = db.collection("settings").doc("psn");
    const configSnap = await configRef.get();

    if (!configSnap.exists) {
      console.log("No PSN config found in Firestore (settings/psn). Exiting.");
      return;
    }

    const { npsso, accountId, lastTitleId, lastTrophyCount } = configSnap.data();

    if (!npsso || !accountId) {
      console.log("Missing NPSSO or accountId in Firestore. Exiting.");
      return;
    }

    // 2. Authenticate with PSN using stored NPSSO
    const accessCode = await exchangeNpssoForCode(npsso);
    const authorization = await exchangeCodeForAccessToken(accessCode);

    // 3. Lightweight Check: Fetch only the single most recently played title
    const titlesResponse = await getUserTitles(authorization, accountId, { limit: 1 });
    const recentGame = titlesResponse?.trophyTitles?.[0];

    if (!recentGame) {
      console.log("No recent games returned from PSN.");
      return;
    }

    const earned = recentGame.earnedTrophies;
    const currentTrophyTotal = (earned.bronze || 0) + (earned.silver || 0) + (earned.gold || 0) + (earned.platinum || 0);

    // 4. Compare with last stored state (skip if no trophies have changed)
    if (recentGame.npCommunicationId === lastTitleId && currentTrophyTotal === lastTrophyCount) {
      console.log(`No change detected for ${recentGame.trophyTitleName}. Skipping deep sync.`);
      return;
    }

    console.log(`Change detected in ${recentGame.trophyTitleName}! Fetching title trophy breakdown...`);

    // 5. Deep Pull: Fetch full trophy list for this game only
    const titleTrophies = await getUserTrophiesEarnedForTitle(
      authorization, 
      accountId, 
      recentGame.npCommunicationId, 
      "all"
    );

    // 6. Save latest state and detailed trophies back to Firestore
    await configRef.set({
      lastTitleId: recentGame.npCommunicationId,
      lastTrophyCount: currentTrophyTotal,
      lastTitleName: recentGame.trophyTitleName,
      lastUpdated: new Date().toISOString()
    }, { merge: true });

    await db.collection("player_trophies").doc(recentGame.npCommunicationId).set({
      titleName: recentGame.trophyTitleName,
      npCommunicationId: recentGame.npCommunicationId,
      totalEarned: currentTrophyTotal,
      trophies: titleTrophies.trophies || [],
      updatedAt: new Date().toISOString()
    }, { merge: true });

    console.log(`Successfully synced trophies for ${recentGame.trophyTitleName}.`);
  } catch (error) {
    console.error("PSN Polling Error:", error);
  }
});
