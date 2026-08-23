<!DOCTYPE html>
<html lang="en">
<head>
    <!-- Line 4: Metadata & Character Encoding -->
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0">
    <title>Sniper Elite 5: Master Log & Progress Tracker</title>
    
    <!-- Line 9: Universal Google Analytics 4 Tag (G-CTYHDF4MSD) via GTM / gtag.js -->
    <script async src="//www.googletagmanager.com/gtag/js?id=G-CTYHDF4MSD"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-CTYHDF4MSD', {
            'anonymize_ip': false,
            'cookie_flags': 'SameSite=None;Secure'
        });
    </script>

    <!-- Line 22: Embedded Mobile-First & Desktop Stylesheet -->
    <style>
        /* === Root Variable Definitions === */
        :root {
            --ser-color: #ff8800;
            --ser-glow: rgba(255, 136, 0, 0.6);
            --bg-base: #0a0a0c;
            --bg-card: #15161a;
            --bg-card-hover: #1c1d22;
            --text-main: #f0f0f0;
            --text-dim: #a0a0a0;
            --border-dim: rgba(255, 255, 255, 0.1);
        }

        /* === Base Layout Reset === */
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            -webkit-tap-highlight-color: transparent;
        }

        body {
            background-color: var(--bg-base);
            color: var(--text-main);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
            font-size: 16px;
            line-height: 1.5;
            min-height: 100vh;
            padding-bottom: 70px;
        }

        /* === Outline Font Utility === */
        .outlined-text {
            text-shadow: 1px 1px 2px #000, -1px -1px 2px #000, 1px -1px 2px #000, -1px 1px 2px #000;
        }

        /* === Top Navigation Header === */
        header {
            background: #111215;
            border-bottom: 2px solid var(--ser-color);
            position: sticky;
            top: 0;
            z-index: 1000;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.7);
        }

        .header-top {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            border-bottom: 1px solid var(--border-dim);
        }

        .header-title {
            font-size: 1.15rem;
            font-weight: 900;
            color: var(--ser-color);
            letter-spacing: 1px;
            text-transform: uppercase;
        }

        .system-status {
            font-size: 0.75rem;
            color: #888;
            font-weight: bold;
            font-family: monospace;
        }

        /* === Dynamic Spreadsheet CSV Menu Bar === */
        #csv-menu-bar {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 6px;
            padding: 8px 16px;
            background: #0d0e11;
            overflow-x: auto;
            white-space: nowrap;
        }

        .csv-single-btn, .csv-dropdown-btn {
            background: transparent;
            color: #ccc;
            border: 1px solid transparent;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 0.78rem;
            font-weight: 700;
            text-decoration: none;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            min-height: 44px;
            transition: all 0.2s ease;
        }

        .csv-single-btn:hover, .csv-dropdown-btn:hover {
            color: var(--ser-color);
            background: rgba(255, 136, 0, 0.1);
            border-color: rgba(255, 136, 0, 0.3);
        }

        .csv-dropdown {
            position: relative;
            display: inline-block;
        }

        .csv-dropdown-content {
            display: none;
            position: absolute;
            top: 100%;
            left: 0;
            background: #18191e;
            border: 1px solid var(--border-dim);
            border-radius: 6px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.8);
            z-index: 2000;
            min-width: 220px;
            max-height: 400px;
            overflow-y: auto;
        }

        .csv-dropdown-content.show {
            display: block;
        }

        .csv-dropdown-item {
            display: flex;
            align-items: center;
            padding: 10px 14px;
            color: #ddd;
            text-decoration: none;
            font-size: 0.8rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            min-height: 44px;
        }

        .csv-dropdown-item:hover {
            background: var(--ser-color);
            color: #000;
            font-weight: bold;
        }

        /* === Operative Selector Hub === */
        .operative-hub {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 8px;
            padding: 14px 16px;
            background: #15161a;
            border-bottom: 1px solid var(--border-dim);
        }

        .profile-btn {
            background: #202228;
            color: #eee;
            border: 1px solid #333;
            border-radius: 6px;
            padding: 8px 16px;
            font-size: 0.85rem;
            font-weight: 800;
            letter-spacing: 0.5px;
            cursor: pointer;
            min-height: 44px;
            transition: all 0.2s ease;
        }

        .profile-btn.active-btn {
            border-color: var(--ser-color);
            color: var(--ser-color);
            box-shadow: 0 0 12px var(--ser-glow);
            background: #282a32;
        }

        /* === Main Progress HUD === */
        .hud-banner {
            max-width: 1400px;
            margin: 16px auto;
            padding: 0 16px;
        }

        .hud-content {
            background: #141519;
            border: 1px solid var(--border-dim);
            border-radius: 8px;
            padding: 16px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        }

        .progress-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }

        .progress-bar-container {
            width: 100%;
            height: 12px;
            background: #202228;
            border-radius: 6px;
            overflow: hidden;
            border: 1px solid #333;
        }

        .progress-bar-fill {
            height: 100%;
            width: 0%;
            background: var(--ser-color);
            box-shadow: 0 0 8px var(--ser-glow);
            transition: width 0.4s ease-in-out;
        }

        /* === Master Container for Category Blocks === */
        #section-container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 8px 16px 40px 16px;
        }

        .category-section {
            width: 100%;
            background: #121316;
            border: 1px solid var(--border-dim);
            border-radius: 8px;
            margin-bottom: 14px;
            overflow: hidden;
        }

        .category-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 14px 18px;
            background: #1a1b20;
            cursor: pointer;
            user-select: none;
            border-bottom: 1px solid transparent;
            min-height: 48px;
        }

        .category-header:hover {
            background: #22242b;
        }

        .category-header h2 {
            font-size: 0.95rem;
            font-weight: 900;
            letter-spacing: 0.5px;
            color: #fff;
            text-transform: uppercase;
        }

        .section-collapsed .category-header {
            border-bottom: none;
        }

        .section-collapsed .section-content {
            display: none !important;
        }

        .section-content {
            padding: 14px;
            background: #0f1013;
        }

        /* === Grid Layout: 1 Col Mobile -> Responsive Multi-Col Desktop === */
        .item-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 12px;
        }

        @media (min-width: 640px) {
            .item-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (min-width: 1024px) {
            .item-grid { grid-template-columns: repeat(3, 1fr); }
        }
        @media (min-width: 1400px) {
            .item-grid { grid-template-columns: repeat(4, 1fr); }
        }

        /* === Individual Item Cards === */
        .item-card {
            background: var(--bg-card);
            border: 1px solid var(--border-dim);
            border-radius: 6px;
            padding: 14px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            min-height: 160px;
            transition: transform 0.15s ease, border-color 0.15s ease;
        }

        .item-card:hover {
            background: var(--bg-card-hover);
            border-color: rgba(255, 255, 255, 0.2);
        }

        .item-card.completed {
            border-color: rgba(76, 175, 80, 0.5);
            background: #0f1a12;
        }

        .item-type-tag {
            display: inline-block;
            font-size: 0.65rem;
            font-weight: 900;
            text-transform: uppercase;
            padding: 2px 6px;
            border-radius: 4px;
            background: #252830;
            color: var(--ser-color);
            margin-bottom: 6px;
            letter-spacing: 0.5px;
        }

        .toggle-btn {
            width: 100%;
            background: #22242c;
            color: #fff;
            border: 1px solid #444;
            border-radius: 4px;
            font-size: 0.78rem;
            font-weight: 800;
            cursor: pointer;
            min-height: 44px;
            margin-top: 10px;
            transition: all 0.2s ease;
        }

        .toggle-btn:hover {
            border-color: var(--ser-color);
            color: var(--ser-color);
        }

        .toggle-btn.completed-btn {
            background: #1b4724;
            border-color: #2e7d32;
            color: #a5d6a7;
        }

        /* === Sticky Verification Footer === */
        #se5-sticky-footer {
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            background: rgba(10, 10, 10, 0.96);
            border-top: 1px solid var(--ser-color);
            box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.85);
            color: #ccc;
            font-size: 11px;
            padding: 8px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-sizing: border-box;
            z-index: 99999;
        }

        .footer-badge {
            background: #1a1a1a;
            border: 1px solid #333;
            padding: 2px 8px;
            border-radius: 4px;
            color: #fff;
            font-weight: bold;
        }
    </style>
</head>
<body>

    <!-- Line 301: Header Navigation & Status Indicator -->
    <header>
        <div class="header-top">
            <div class="header-title outlined-text">Sniper Elite 5: Master Log</div>
            <div id="stat-line" class="system-status">LINKING CLOUD...</div>
        </div>
        <nav id="csv-menu-bar"></nav>
    </header>

    <!-- Line 310: Operative Switching Bar -->
    <section class="operative-hub">
        <button class="profile-btn active-btn" onclick="appState.switchHunter('Werewolf3788')">Werewolf3788</button>
        <button class="profile-btn" onclick="appState.switchHunter('Raymystyro')">Raymystyro</button>
        <button class="profile-btn" onclick="appState.switchHunter('Terrdog')">Terrdog</button>
        <button class="profile-btn" onclick="appState.switchHunter('Elu Cloud')">Elu Cloud</button>
    </section>

    <!-- Line 318: HUD Progress Meter -->
    <section class="hud-banner">
        <div class="hud-content">
            <div class="progress-header">
                <span id="hunter-display" class="outlined-text" style="font-weight:900; color:var(--ser-color); font-size: 0.9rem;">WEREWOLF3788</span>
                <span id="percent-text" class="outlined-text" style="font-weight:900; font-size: 0.85rem;">INITIALIZING...</span>
            </div>
            <div class="progress-bar-container">
                <div id="overall-bar" class="progress-bar-fill"></div>
            </div>
        </div>
    </section>

    <!-- Line 331: Dynamic Collectibles Target Container -->
    <main id="section-container">
        <!-- Rendered dynamically by tracker.js -->
    </main>

    <!-- Line 336: Script execution with direct cache-busting timestamp query -->
    <script type="module" src="tracker.js?v=20260822_2250"></script>
</body>
</html>
