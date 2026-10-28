// Section 10: Dynamic Manifest Catalog & Auto Pill Bar Loader
async function initGameCatalog() {
    const timestamp = Date.now();
    const manifestUrls = [
        `./data/games/index.json?t=${timestamp}`,
        `./data/index.json?t=${timestamp}`,
        `../game/data/games/index.json?t=${timestamp}`,
        `../game/data/index.json?t=${timestamp}`,
        `//werewolf3788.github.io/Website/game/data/games/index.json?t=${timestamp}`,
        `//werewolf3788.github.io/Website/game/data/index.json?t=${timestamp}`
    ];

    let manifest = null;
    let manifestLoadedFrom = '';

    for (const url of manifestUrls) {
        try {
            const res = await fetch(url);
            if (res.ok) {
                manifest = await res.json();
                manifestLoadedFrom = url;
                break;
            }
        } catch (e) {}
    }

    const urlParams = new URLSearchParams(window.location.search);
    const slugAttr = (document.body && document.body.dataset) ? document.body.dataset.game : null;
    const targetSlug = String(urlParams.get('game') || slugAttr || manifest?.defaultGame || 'farcry5').toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'farcry5';

    let selectedEntry = null;

    if (manifest && Array.isArray(manifest.games)) {
        renderGamePillsFromManifest(manifest.games);
        selectedEntry = manifest.games.find(g => g.id.toLowerCase() === targetSlug) || manifest.games[0];
        console.log(`[Manifest Loaded] Loaded index manifest from: ${manifestLoadedFrom}`);
    }

    // Direct path candidates: YOUR ORIGINAL WORKING PATHS TAKE PRIORITY
    const candidatePaths = [];
    if (selectedEntry?.path) candidatePaths.push(selectedEntry.path);
    candidatePaths.push(
        `./data/${targetSlug}.json`,
        `./${targetSlug}.json`,
        `../game/data/${targetSlug}.json`,
        `./data/games/${targetSlug}.json`,
        `../game/data/games/${targetSlug}.json`,
        `/Website/game/data/${targetSlug}.json`,
        `//werewolf3788.github.io/Website/game/data/${targetSlug}.json`,
        `//raw.githubusercontent.com/Werewolf3788/Website/main/game/data/${targetSlug}.json`,
        `//raw.githubusercontent.com/Werewolf3788/Website/main/game/data/games/${targetSlug}.json`
    );

    let gameJson = null;
    let resolvedPath = '';

    for (const p of candidatePaths) {
        if (!p) continue;
        try {
            const fetchUrl = p.includes('?') ? p : `${p}?t=${timestamp}`;
            const res = await fetch(fetchUrl);
            if (res.ok) {
                gameJson = await res.json();
                resolvedPath = p;
                break;
            }
        } catch (e) {}
    }

    if (!gameJson) {
        console.error(`[Load Error] Failed to fetch game JSON for '${targetSlug}' across all candidate paths.`);
        return;
    }

    console.log(`[Game Loaded] Successfully fetched ${gameJson.game || targetSlug} from: ${resolvedPath}`);

    appState.gameData = gameJson;
    appState.activeGame = gameJson.game || selectedEntry?.name || "Far Cry 5";
    appState.activeGameId = gameJson.gameId || selectedEntry?.id || targetSlug;
    
    const jsonCommId = gameJson.commId || gameJson.psn_communication_id || selectedEntry?.commId || "NPWR12514_00";
    if (jsonCommId) appState.activePsnCommId = jsonCommId;
    if (gameJson.activeMission) appState.activeMission = gameJson.activeMission;

    const titleEl = document.getElementById('pageTitle');
    const displayEl = document.getElementById('gameTitleDisplay');
    const headerTitle = document.getElementById('resistance-name');
    if (titleEl) titleEl.innerText = `${appState.activeGame} — Companion & Field Ledger`;
    if (displayEl) displayEl.innerText = `${appState.activeGame} Hub`;
    if (headerTitle) headerTitle.innerText = `${appState.activeUser.toUpperCase()} [${appState.platform.toUpperCase()}]`;

    await syncPsnSkeleton();
    renderFarCry5Companion(gameJson);
}

function renderGamePillsFromManifest(gamesList) {
    const pillBar = document.getElementById('gamePillsBar');
    if (!pillBar) return;

    const currentSlug = (new URLSearchParams(window.location.search).get('game') || 'farcry5').toLowerCase();

    pillBar.innerHTML = gamesList.map(g => {
        const isActive = g.id.toLowerCase() === currentSlug;
        return `
            <a href="?game=${encodeURIComponent(g.id)}" class="game-pill ${isActive ? 'active' : ''}" style="text-decoration:none;">
                <span>${g.icon || '🎮'}</span>
                <span>${escapeHtml(g.name)}</span>
            </a>
        `;
    }).join('');
}
