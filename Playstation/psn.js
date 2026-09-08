/* ============================================================================
 * File: psn.js
 * Location: /Playstation/psn.js
 * Description: Squad Pack Sync Engine - Immutable Data & Custom Playtime Tracker
 * Database: Realtime Database (entertainment-71888)
 * Target Endpoint: https://entertainment-71888-default-rtdb.firebaseio.com/psn.json
 * Version: 20.0.0 - Delta Playtime & Immutable Trophy Audit
 * Date & Time Stamp: 2026-09-07 20:00:00 (24hr Chicago Time)
 * ============================================================================ */

// ----------------------------------------------------------------------------
// [SECTION: SAFE FIREBASE WRITES (NO OVERWRITES / NO DELETES)]
// ----------------------------------------------------------------------------

// Use PATCH instead of PUT to update only specific fields without wiping nodes
async function patchFirebaseNode(endpointPath, payload) {
    const targetUrl = `${FIREBASE_BASE_URL}/${endpointPath}.json`;
    const response = await fetch(targetUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const errorText = await response.text();
        console.error(`[FIREBASE PATCH ERROR] ${endpointPath}: ${errorText}`);
    }
}

// ----------------------------------------------------------------------------
// [SECTION: CUSTOM PLAYTIME ACCUMULATOR]
// ----------------------------------------------------------------------------
/**
 * Records time spent in a game.
 * If user was seen in the same game recently, adds elapsed minutes to total.
 */
function recordCustomPlaytime(gamerTag, gameTitle, existingPlaytimeObj, lastScanTime) {
    if (!gameTitle || gameTitle === "Dashboard") return null;

    // Sanitize game title for Firebase key compatibility
    const safeGameKey = gameTitle.replace(/[\.\#\$\[\]\/]/g, "_").trim();
    const now = Date.now();

    const gameStats = existingPlaytimeObj?.[safeGameKey] || {
        gameTitle: gameTitle,
        totalMinutes: 0,
        totalHoursFormatted: "0 mins",
        firstRecorded: new Date().toLocaleString("en-US", { timeZone: "America/Chicago", hour12: false }),
        sessionCount: 0
    };

    // Calculate time elapsed since last successful scan (expected ~10 mins)
    let elapsedMinutes = 10;
    if (lastScanTime) {
        const diffMs = now - new Date(lastScanTime).getTime();
        const diffMins = Math.round(diffMs / 60000);
        // If the gap is reasonable (between 5 and 20 mins), use actual elapsed time
        if (diffMins >= 5 && diffMins <= 20) {
            elapsedMinutes = diffMins;
        }
    }

    const updatedMinutes = gameStats.totalMinutes + elapsedMinutes;
    const hours = Math.floor(updatedMinutes / 60);
    const mins = updatedMinutes % 60;

    let formatted = "";
    if (hours > 0 && mins > 0) formatted = `${hours}h ${mins}m`;
    else if (hours > 0) formatted = `${hours} hrs`;
    else formatted = `${mins} mins`;

    const updatedGameStats = {
        ...gameStats,
        gameTitle: gameTitle,
        totalMinutes: updatedMinutes,
        totalHoursFormatted: formatted,
        lastPlayed: new Date().toLocaleString("en-US", { timeZone: "America/Chicago", hour12: false }),
        lastActiveTimestamp: now
    };

    return { safeGameKey, updatedGameStats };
}

// ----------------------------------------------------------------------------
// [SECTION: TELEMETRY & TROPHY POP RUNNER]
// ----------------------------------------------------------------------------
async function getFullUserData(auth, gamerTag, userKey, targetId, existingData) {
    let resolvedTargetId = targetId || ACCOUNT_IDS[userKey];

    if (!resolvedTargetId && auth?.accessToken) {
        if (auth.userKey === userKey) {
            try {
                const payload = JSON.parse(Buffer.from(auth.accessToken.split('.')[1], 'base64').toString());
                resolvedTargetId = payload.account_id || "";
            } catch(e) {}
        } else {
            resolvedTargetId = await resolveAccountIdFromSearch(auth, gamerTag);
            if (resolvedTargetId) ACCOUNT_IDS[userKey] = resolvedTargetId;
        }
    }

    if (!auth || !resolvedTargetId) {
        return existingData || generatePrivateProfileFallback(gamerTag, userKey, existingData);
    }

    try {
        const presenceId = (ACCOUNT_IDS.ray === resolvedTargetId || userKey === 'wildhorse_spirit') ? "me" : resolvedTargetId;

        // 1. PRESENCE SCAN (Runs every 10 min)
        let rawP = { primaryPlatformInfo: { onlineStatus: 'offline' }, gameTitleInfoList: [] };
        try { 
            const raw = await getBasicPresence(auth, presenceId); 
            rawP = raw?.basicPresence || (Array.isArray(raw) ? raw[0] : (raw?.basicPresences ? raw.basicPresences[0] : raw)) || rawP;
        } catch(e) {}

        const isConsoleOnline = (rawP.primaryPlatformInfo?.onlineStatus || "offline") !== "offline";
        const activeGameInfo = rawP?.gameTitleInfoList?.[0] || {};
        const currentTitle = activeGameInfo.titleName || (isConsoleOnline ? "Dashboard" : "Offline");
        const currentCommId = activeGameInfo.npCommunicationId || null;
        const currentPlatform = rawP.primaryPlatformInfo?.platform?.toUpperCase() || existingData?.platform || "PS5";

        // 2. INCREMENT CUSTOM PLAYTIME IF PLAYING A GAME
        let playtimeData = existingData?.customPlaytime || {};
        let activeGamePlaytimeStr = "0 mins";

        if (isConsoleOnline && currentTitle !== "Dashboard" && currentTitle !== "Offline") {
            const timeResult = recordCustomPlaytime(
                gamerTag, 
                currentTitle, 
                playtimeData, 
                existingData?.lastPresenceCheckTimestamp
            );

            if (timeResult) {
                playtimeData[timeResult.safeGameKey] = timeResult.updatedGameStats;
                activeGamePlaytimeStr = timeResult.updatedGameStats.totalHoursFormatted;

                // Non-destructive patch directly to game node
                await patchFirebaseNode(
                    `gamertags/${gamerTag}/customPlaytime/${timeResult.safeGameKey}`, 
                    timeResult.updatedGameStats
                );
                console.log(`[PLAYTIME ACCUMULATED] ${gamerTag} - ${currentTitle}: Total ${activeGamePlaytimeStr}`);
            }
        }

        // 3. SCAN TROPHY SUMMARY (Detect new unlocks)
        const stats = await getUserTrophyProfileSummary(auth, resolvedTargetId).catch(() => ({}));
        const newTotalEarned = (stats?.earnedTrophies?.platinum||0) + (stats?.earnedTrophies?.gold||0) + (stats?.earnedTrophies?.silver||0) + (stats?.earnedTrophies?.bronze||0);
        const oldTotalEarned = existingData?.trophySummary?.total || 0;
        const hasNewTrophyPopped = oldTotalEarned > 0 && newTotalEarned > oldTotalEarned;

        let mostRecentTrophies = existingData?.mostRecentTrophies || [];
        let newlyUnlockedTrophy = null;

        // 4. FETCH NEW TROPHY AND APPEND IMMUTABLY
        if (hasNewTrophyPopped && currentCommId) {
            console.log(`[NEW TROPHY DETECTED] ${gamerTag} unlocked a trophy in ${currentTitle}!`);
            try {
                const opt = { npServiceName: currentPlatform === "PS5" ? "trophy2" : "trophy" };
                const earnedRes = await getUserTrophiesEarnedForTitle(auth, resolvedTargetId, currentCommId, "all", opt).catch(()=>({}));
                const metaRes = await getTitleTrophies(auth, currentCommId, "all", opt).catch(()=>({}));

                const earnedList = (earnedRes?.trophies || []).filter(t => t.earned);
                const metaList = metaRes?.trophies || [];
                earnedList.sort((a, b) => new Date(b.earnedDateTime).getTime() - new Date(a.earnedDateTime).getTime());

                if (earnedList.length > 0) {
                    const topEarned = earnedList[0];
                    const meta = metaList.find(m => m.trophyId === topEarned.trophyId) || {};

                    newlyUnlockedTrophy = {
                        game: currentTitle,
                        platform: currentPlatform,
                        trophyId: topEarned.trophyId,
                        name: meta.trophyName || "Unknown Trophy",
                        type: meta.trophyType || "bronze",
                        rarity: meta.trophyRare ? `${meta.trophyRare}%` : "Rare",
                        icon: meta.trophyIconUrl || existingData?.currentGameArt,
                        timestamp: new Date(topEarned.earnedDateTime).getTime(),
                        dateEarned: new Date(topEarned.earnedDateTime).toLocaleString("en-US", { timeZone: "America/Chicago", hour12: false }),
                        recordedAt: new Date().toLocaleString("en-US", { timeZone: "America/Chicago", hour12: false })
                    };

                    // Add to recent list while preventing exact name duplicates
                    mostRecentTrophies = [
                        newlyUnlockedTrophy, 
                        ...mostRecentTrophies.filter(t => t.name !== newlyUnlockedTrophy.name)
                    ].slice(0, 15);

                    // 1. Permanently store in an immutable history ledger (Never gets overwritten)
                    const trophyRecordKey = `${currentCommId}_T${topEarned.trophyId}`;
                    await patchFirebaseNode(
                        `gamertags/${gamerTag}/trophyHistory/${trophyRecordKey}`, 
                        newlyUnlockedTrophy
                    );

                    // 2. Queue for Twitch Chat Alert
                    await syncNodeToFirebase(`twitchAlertQueue/${gamerTag}_${Date.now()}`, {
                        gamerTag,
                        game: currentTitle,
                        trophyName: newlyUnlockedTrophy.name,
                        trophyType: newlyUnlockedTrophy.type,
                        rarity: newlyUnlockedTrophy.rarity,
                        icon: newlyUnlockedTrophy.icon,
                        dateEarned: newlyUnlockedTrophy.dateEarned
                    });
                }
            } catch (err) {
                console.error(`[TROPHY CAPTURE ERROR] Failed to fetch trophy details: ${err.message}`);
            }
        }

        // 5. UPDATE GAME ART IF CHANGED (Preserves OBS stream poster art)
        let activeArt = existingData?.currentGameArt || null;
        if (isConsoleOnline && currentTitle !== "Dashboard" && currentTitle !== existingData?.currentGame) {
            try {
                const history = await getRecentlyPlayedGames(auth, resolvedTargetId, { limit: 5 });
                const recentList = history?.data?.recentlyPlayedTitles || history?.recentlyPlayedTitles || [];
                const matched = recentList.find(g => g.name?.toLowerCase() === currentTitle.toLowerCase()) || recentList[0];
                if (matched?.image?.url) activeArt = matched.image.url;
            } catch (e) {}
        }

        // 6. DISPATCH SAFE DELTA TO FIREBASE
        const nowChicago = new Date().toLocaleString("en-US", { timeZone: "America/Chicago", hour12: false });
        const deltaUpdate = {
            online: isConsoleOnline,
            currentGame: currentTitle,
            currentGameArt: activeArt,
            currentGameActivity: activeGameInfo.formatValue || (isConsoleOnline ? "In-Game" : "Offline"),
            currentGamePlaytime: activeGamePlaytimeStr,
            platform: currentPlatform,
            mostRecentTrophies: mostRecentTrophies,
            lastPresenceCheckTimestamp: new Date().toISOString(),
            lastUpdated: nowChicago
        };

        if (stats?.trophyLevel) {
            deltaUpdate["trophySummary/total"] = newTotalEarned;
            deltaUpdate["trophySummary/platinum"] = stats.earnedTrophies?.platinum || 0;
            deltaUpdate["trophySummary/gold"] = stats.earnedTrophies?.gold || 0;
            deltaUpdate["trophySummary/silver"] = stats.earnedTrophies?.silver || 0;
            deltaUpdate["trophySummary/bronze"] = stats.earnedTrophies?.bronze || 0;
            deltaUpdate["level"] = stats.trophyLevel || 0;
        }

        // PATCH ensures all previous sync data, badges, and milestones remain untouched
        await patchFirebaseNode(`gamertags/${gamerTag}`, deltaUpdate);

        return {
            ...existingData,
            ...deltaUpdate,
            customPlaytime: playtimeData
        };

    } catch (e) {
        console.warn(`[WARN] Fetch exception for ${gamerTag}:`, e.message);
        return existingData;
    }
}
