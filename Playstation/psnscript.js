const psnApi = require("psn-api");
const {
    exchangeNpssoForCode,
    exchangeCodeForAccessToken,
    getUserTitles,
    getUserTrophyProfileSummary,
    getUserTrophiesEarnedForTitle,
    getTitleTrophies,
    makeUniversalSearch
} = psnApi;

const fs = require("fs");
const path = require("path");

// Requirement 10: Your specific friend list IDs
const SQUAD_IDS = {
    ray: "raymystyro",       // OneLIVIDMAN
    darkwing: "Darkwing69420", // TJ / Terrdog
    phoenix: "phoenix_darkfire", // Seth / Fluffy
    elucidator: "ElucidatorVah"
};

const BLACKLIST = ["grand theft auto v", "grand theft auto online", "gta v", "gta online", "grand theft auto"];

// Requirement 7: Parse playtime duration (PT12H30M -> 12h 30m)
const parsePlaytime = (duration) => {
    if (!duration) return "--";
    const h = duration.match(/(\d+)H/);
    const m = duration.match(/(\d+)M/);
    return `${h ? h[1]+'h' : ''} ${m ? m[1]+'m' : ''}`.trim() || "0h";
};

// Helper for Presence (Requirement 11)
const getPresence = async (auth, accountId) => {
    const func = psnApi.getPresenceFromUser || psnApi.getPresenceOfUser || psnApi.getUserPresence;
    try {
        const p = await func(auth, accountId);
        return {
            online: p.primaryPlatformInfo?.onlineStatus === "online",
            game: p.gameTitleInfoList?.[0]?.titleName || ""
        };
    } catch (e) { return { online: false, game: "" }; }
};

async function getFullUserData(npsso, label) {
    try {
        console.log(`--- Syncing ${label} ---`);
        const accessCode = await exchangeNpssoForCode(npsso);
        const authorization = await exchangeCodeForAccessToken(accessCode);
        
        // Req 11: Console Status
        const presence = await getPresence(authorization, "me");

        // Req 1, 2, 5, 6, 7, 9: Game info, Art, Progress, Ratio, Hours, and History
        const { trophyTitles } = await getUserTitles(authorization, "me");
        const recentGames = [];
        let latestTrophy = null;

        for (const title of trophyTitles) {
            const name = title.trophyTitleName;
            if (BLACKLIST.some(f => name.toLowerCase().includes(f))) continue;

            // Req 6: 33/100 Ratio logic
            const earned = title.earnedTrophies.platinum + title.earnedTrophies.gold + title.earnedTrophies.silver + title.earnedTrophies.bronze;
            const total = title.definedTrophies.platinum + title.definedTrophies.gold + title.definedTrophies.silver + title.definedTrophies.bronze;
            const ratio = `${earned}/${total}`;

            if (recentGames.length < 5) {
                recentGames.push({
                    name: name,
                    art: title.trophyTitleIconUrl, // Req 2
                    progress: title.progress,     // Req 5
                    ratio: ratio,                 // Req 6
                    hours: parsePlaytime(title.playDuration) // Req 7
                });
            }

            // Req 3 & 4: Latest Trophy
            if (!latestTrophy) {
                try {
                    const { trophies } = await getUserTrophiesEarnedForTitle(authorization, "me", title.npCommunicationId, "all");
                    const { trophies: meta } = await getTitleTrophies(authorization, title.npCommunicationId, "all");
                    const lastEarned = trophies.filter(t => t.earned).sort((a,b) => new Date(b.earnedDateTime) - new Date(a.earnedDateTime))[0];
                    if (lastEarned) {
                        const m = meta.find(x => x.trophyId === lastEarned.trophyId);
                        latestTrophy = { name: m.trophyName, icon: m.trophyIconUrl, game: name };
                    }
                } catch (e) {}
            }
        }

        const stats = await getUserTrophyProfileSummary(authorization, "me");
        return {
            online: presence.online,
            currentGame: presence.game || "Dashboard",
            gameArt: recentGames[0]?.art || "",
            hours: recentGames[0]?.hours || "--",
            progress: recentGames[0]?.progress || 0,
            ratio: recentGames[0]?.ratio || "0/0",
            recentTrophy: latestTrophy,
            recentGames: recentGames,
            level: stats.trophyLevel,
            lastUpdated: new Date().toLocaleString()
        };
    } catch (e) { console.error(e); return null; }
}

async function main() {
    const werewolfToken = process.env.PSN_NPSSO_WEREWOLF;
    const rayToken = process.env.PSN_NPSSO_RAY;
    let finalData = { users: {} };
    const dataPath = path.join(__dirname, "psn_data.json");

    if (werewolfToken) {
        const authCode = await exchangeNpssoForCode(werewolfToken);
        const auth = await exchangeCodeForAccessToken(authCode);
        finalData.users.werewolf = await getFullUserData(werewolfToken, "Werewolf");

        // Req 8 & 10: Friends Sync
        for (const [key, onlineId] of Object.entries(SQUAD_IDS)) {
            try {
                const search = await makeUniversalSearch(auth, onlineId, "socialAccounts");
                const accId = search.domainResponses[0].results[0].socialMetadata.accountId;
                finalData.users[key] = await getPresence(auth, accId);
            } catch (e) { finalData.users[key] = { online: false, game: "" }; }
        }
    }

    if (rayToken) {
        const rayDetail = await getFullUserData(rayToken, "Ray");
        if (rayDetail) finalData.users.ray = rayDetail;
    }

    fs.writeFileSync(dataPath, JSON.stringify(finalData, null, 2));
}

main();
