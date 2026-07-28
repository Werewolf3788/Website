/* === SECTION: Smart SPA Engine with Router, Settings & Firebase Auth === */
/*
    Version: 1.2.0 | Timestamp: 2026-07-28T03:32:00Z
    Description: Single Page Application Engine featuring Hash Routing (#/ and #/settings), 
                 Google Sheets Dynamic Nav, Open-Meteo Weather, Twitch Stream Status, 
                 Persistent Local Auth, Firestore Telemetry, and Full Operator Settings Matrix.
*/

import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { 
    getAuth, 
    setPersistence, 
    browserLocalPersistence, 
    GoogleAuthProvider, 
    FacebookAuthProvider,
    GithubAuthProvider,
    TwitterAuthProvider,
    signInWithPopup, 
    linkWithPopup,
    unlink,
    signOut, 
    onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js';

// User Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyA_O_Qm3bazJpi6wPqafsKLNNJdIUCvQGM",
    authDomain: "game-tracker-5b2ef.firebaseapp.com",
    databaseURL: "https://game-tracker-5b2ef-default-rtdb.firebaseio.com",
    projectId: "game-tracker-5b2ef",
    storageBucket: "game-tracker-5b2ef.firebasestorage.app",
    messagingSenderId: "555667047127",
    appId: "1:555667047127:web:af6f468ca3cf06759aa692"
};

const ADMIN_EMAIL = "raykevin71888@gmail.com";

const USER_DATA_MAP = {
    'Werewolf3788': 'Werewolf3788',
    'werewolf3788': 'Werewolf3788',
    'Raymystyro': 'Raymystyro',
    'raymystyro': 'Raymystyro',
    'terrdog420': 'terrdog420',
    'Terrdog420': 'terrdog420',
    'Marc': 'Marc',
    'marc': 'Marc'
};

const PROVIDER_METADATA = {
    'google.com': { name: 'Google Account', icon: 'fa-brands fa-google text-red-400', getProvider: () => new GoogleAuthProvider() },
    'facebook.com': { name: 'Facebook', icon: 'fa-brands fa-facebook text-blue-500', getProvider: () => new FacebookAuthProvider() },
    'github.com': { name: 'GitHub', icon: 'fa-brands fa-github text-slate-200', getProvider: () => new GithubAuthProvider() },
    'twitter.com': { name: 'Twitter / X', icon: 'fa-brands fa-x-twitter text-slate-300', getProvider: () => new TwitterAuthProvider() }
};

let app, auth, db, rtdb, currentUser = null;
const googleProvider = new GoogleAuthProvider();

/* === SECTION: SPA View Templates === */
function renderHomeView() {
    return `
    <!-- Hero Section -->
    <header class="section-padding px-4 flex-grow flex items-center">
        <div class="max-w-4xl mx-auto text-center">
            <h1>Knowing the Players</h1>
            <p class="mt-6 text-slate-400 max-w-2xl mx-auto leading-relaxed">
                We all have a PS5 or a PlayStation account, though our usernames are not our gamertags. Click on each player and view their profile to see how they progress through their gaming world.
            </p>
        </div>
    </header>

    <!-- Team Section -->
    <section id="team" class="section-padding bg-slate-900/50">
        <div class="max-w-7xl mx-auto px-4">
            <div class="text-center mb-12">
                <h2>Project Contributors</h2>
                <div class="h-1 w-20 bg-sky-500 mx-auto mt-4 rounded-full"></div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <!-- Werewolf3788 -->
                <div id="card-werewolf" class="custom-card p-6 text-center shadow-werewolf">
                    <div class="weather-layer" id="layer-werewolf"></div>
                    <div class="card-content">
                        <div class="w-24 h-24 mx-auto mb-4 relative">
                            <img src="https://static-cdn.jtvnw.net/jtv_user_pictures/1a4efdb4-023e-4802-b07c-82c09a45c4c8-profile_image-70x70.png" 
                                 class="w-full h-full rounded-full border-2 border-werewolf object-cover shadow-lg">
                            <div id="twitch-status-indicator-werewolf" class="hidden absolute bottom-1 right-1">
                                <span class="status-pulse"></span>
                            </div>
                        </div>
                        <h3 class="text-xl mb-1 text-white">Werewolf3788</h3>
                        <p class="text-werewolf text-xs font-bold uppercase tracking-tighter mb-1">Admin / Streamer</p>
                        <p id="weather-desc-werewolf" class="weather-desc text-[10px] opacity-70 mb-2 italic">Updating weather...</p>
                        <div class="mb-4 min-h-[20px]">
                            <p id="twitch-game-werewolf" class="text-slate-400 text-[10px] uppercase font-bold italic tracking-widest">Checking Twitch...</p>
                        </div>
                        <a href="./users/kevin/website.html" class="visit-link inline-block text-slate-400 hover:text-white border-b border-slate-700 hover:border-werewolf text-xs transition-colors">Visit Profile</a>
                    </div>
                </div>

                <!-- Raymystyro -->
                <div id="card-ray" class="custom-card p-6 text-center shadow-ray">
                    <div class="weather-layer" id="layer-ray"></div>
                    <div class="card-content">
                        <div class="w-24 h-24 mx-auto mb-4 relative">
                            <img src="https://static-cdn.jtvnw.net/jtv_user_pictures/032a0367-589f-4763-94de-4fc679a0b2df-profile_image-70x70.png" 
                                 class="w-full h-full rounded-full border-2 border-ray object-cover shadow-lg">
                            <div id="twitch-status-indicator-ray" class="hidden absolute bottom-1 right-1">
                                <span class="status-pulse"></span>
                            </div>
                        </div>
                        <h3 class="text-xl mb-1 text-white">Raymystyro</h3>
                        <p class="text-ray text-xs font-bold uppercase tracking-tighter mb-1">Contributor / Streamer</p>
                        <p id="weather-desc-ray" class="weather-desc text-[10px] opacity-70 mb-2 italic">Updating weather...</p>
                        <div class="mb-4 min-h-[20px]">
                            <p id="twitch-game-ray" class="text-slate-400 text-[10px] uppercase font-bold italic tracking-widest">Checking Twitch...</p>
                        </div>
                        <a href="./users/ray/website.html" class="visit-link inline-block text-slate-400 hover:text-white border-b border-slate-700 hover:border-ray text-xs transition-colors">Visit Profile</a>
                    </div>
                </div>

                <!-- Terrdog420 -->
                <div id="card-tj" class="custom-card p-6 text-center shadow-terrdog">
                    <div class="weather-layer" id="layer-tj"></div>
                    <div class="card-content">
                        <div class="w-24 h-24 mx-auto mb-4 relative">
                            <img src="https://static-cdn.jtvnw.net/jtv_user_pictures/9dad426e-04cb-4fc0-a917-25982b3800ce-profile_image-70x70.png" 
                                 class="w-full h-full rounded-full border-2 border-terrdog object-cover shadow-lg">
                            <div id="twitch-status-indicator-tj" class="hidden absolute bottom-1 right-1">
                                <span class="status-pulse"></span>
                            </div>
                        </div>
                        <h3 class="text-xl mb-1 text-white">Terrdog420</h3>
                        <p class="text-terrdog text-xs font-bold uppercase tracking-tighter mb-1">Contributor / Streamer</p>
                        <p id="weather-desc-tj" class="weather-desc text-[10px] opacity-70 mb-2 italic">Updating weather...</p>
                        <div class="mb-4 min-h-[20px]">
                            <p id="twitch-game-tj" class="text-slate-400 text-[10px] uppercase font-bold italic tracking-widest">Checking Twitch...</p>
                        </div>
                        <a href="./users/tj/overlay.html" class="visit-link inline-block text-slate-400 hover:text-white border-b border-slate-700 hover:border-terrdog text-xs transition-colors">Visit Profile</a>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- Movie Library Section -->
    <section class="section-padding bg-slate-900/30">
        <div class="max-w-7xl mx-auto px-4">
            <div id="cinema-container" class="custom-card p-10 border border-orange-500/30 flex flex-col items-center justify-center shadow-orange-500/10 shadow-2xl text-center relative overflow-hidden min-h-[500px]">
                <div id="cinema-layer-1" class="absolute inset-0 transition-opacity duration-1000 opacity-100 z-0">
                    <div class="absolute inset-0 bg-cover bg-center blur-2xl scale-110 opacity-50"></div>
                    <div class="absolute inset-0 bg-contain bg-center bg-no-repeat drop-shadow-2xl"></div>
                </div>
                <div id="cinema-layer-2" class="absolute inset-0 transition-opacity duration-1000 opacity-0 z-0">
                    <div class="absolute inset-0 bg-cover bg-center blur-2xl scale-110 opacity-50"></div>
                    <div class="absolute inset-0 bg-contain bg-center bg-no-repeat drop-shadow-2xl"></div>
                </div>
                <div class="absolute inset-0 bg-slate-950/70 z-0"></div>
                
                <div class="relative z-10 flex flex-col items-center justify-center gap-6 w-full">
                    <h2 class="text-orange-500 outline-text">Werewolf Cinema</h2>
                    <p class="text-slate-200 font-bold outline-text max-w-md">Access the list of Movies I own digitally, plus see what they're streaming on. Google, YouTube, Apple, Fandango, and Movies Anywhere are manually integrated, along with Amazon affiliate search. Enjoy!</p>
                    
                    <a href="https://werewolf3788.github.io/Website/Movies.html" 
                       target="werewolf_cinema_window" 
                       class="bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 px-10 rounded-lg transition-all shadow-[0_0_15px_rgba(255,95,31,0.5)] border border-orange-400 outline-text">
                        MOVIES
                    </a>
                    
                    <div class="mt-2 flex flex-col items-center">
                        <span class="text-slate-300 text-xs font-black uppercase tracking-widest outline-text">Total Titles in Archive</span>
                        <span id="movie-count" class="text-4xl font-black text-white mt-1 outline-text drop-shadow-[0_0_10px_rgba(255,95,31,0.8)]">Loading...</span>
                    </div>
                </div>
            </div>
        </div>
    </section>

    <!-- SMART FIREBASE GAMING MODULES SECTION -->
    <section class="section-padding">
        <div class="max-w-7xl mx-auto px-4">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
                <div>
                    <span class="text-sky-500 font-bold uppercase tracking-widest text-xs">Real-Time Cloud Telemetry</span>
                    <h2 class="mt-2">Active Gaming Modules</h2>
                    <p class="mt-2 text-slate-400 text-sm max-w-xl">
                        Smart Module Filter: Games only display when active progress is detected in Firestore.
                    </p>
                </div>
                <div class="text-xs font-mono text-slate-500 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span id="firebase-live-status">FIRESTORE ACTIVE</span>
                </div>
            </div>

            <div id="smart-games-grid" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- MODULE 1: SE5 -->
                <div id="module-se5" class="hidden custom-card p-6 border border-amber-500/30 flex-col justify-between hover:border-amber-500/60 transition-all">
                    <div>
                        <div class="flex justify-between items-center mb-3">
                            <span class="text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded">Sniper Elite 5</span>
                            <i class="fa-solid fa-crosshairs text-amber-500 text-lg"></i>
                        </div>
                        <h3 class="text-xl font-black text-white mb-2">SE5 Master Log</h3>
                        <p class="text-slate-400 text-xs mb-6 italic">Full mission collectibles, workbenches, stone eagles, and personal letters.</p>
                        <div id="se5-progress-container" class="space-y-3 mb-6"></div>
                    </div>
                    <a href="./games/sniper-elite-5.html" class="mt-4 w-full text-center bg-slate-800 hover:bg-amber-600 text-slate-200 hover:text-white font-bold py-2.5 px-4 rounded-lg text-xs transition-all border border-slate-700 flex items-center justify-center gap-2">
                        <span>Open SE5 Master Tracker</span>
                        <i class="fa-solid fa-arrow-right text-[10px]"></i>
                    </a>
                </div>

                <!-- MODULE 2: COTW -->
                <div id="module-cotw" class="hidden custom-card p-6 border border-emerald-500/30 flex-col justify-between hover:border-emerald-500/60 transition-all">
                    <div>
                        <div class="flex justify-between items-center mb-3">
                            <span class="text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded">theHunter: COTW</span>
                            <i class="fa-solid fa-paw text-emerald-500 text-lg"></i>
                        </div>
                        <h3 class="text-xl font-black text-white mb-2">COTW Master Tracker</h3>
                        <p class="text-slate-400 text-xs mb-4 italic">Reserves, rare furs, trophy lodge audits, and active map stream deployment.</p>

                        <div id="cotw-active-map-badge" class="mb-4 bg-slate-900/80 border border-emerald-500/40 rounded-lg p-2.5 flex items-center justify-between">
                            <div class="text-[10px] text-slate-400 font-bold uppercase">Active Deployed Map</div>
                            <div id="cotw-active-map-name" class="text-xs font-black text-emerald-400">--</div>
                        </div>
                        <div id="cotw-progress-container" class="space-y-3 mb-6"></div>
                    </div>
                    <a href="./games/thehunter-call-of-the-wild.html" class="mt-4 w-full text-center bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white font-bold py-2.5 px-4 rounded-lg text-xs transition-all border border-slate-700 flex items-center justify-center gap-2">
                        <span>Open COTW Master Tracker</span>
                        <i class="fa-solid fa-arrow-right text-[10px]"></i>
                    </a>
                </div>

                <!-- MODULE 3: SER -->
                <div id="module-ser" class="hidden custom-card p-6 border border-sky-500/30 flex-col justify-between hover:border-sky-500/60 transition-all">
                    <div>
                        <div class="flex justify-between items-center mb-3">
                            <span class="text-[10px] font-black uppercase tracking-wider bg-sky-500/10 text-sky-400 border border-sky-500/30 px-2 py-0.5 rounded">Sniper Elite Resistance</span>
                            <i class="fa-solid fa-person-rifle text-sky-500 text-lg"></i>
                        </div>
                        <h3 class="text-xl font-black text-white mb-2">Resistance Log</h3>
                        <p class="text-slate-400 text-xs mb-6 italic">Campaign kill lists, hidden items, gnomes, propaganda posters, and trophies.</p>
                        <div id="ser-progress-container" class="space-y-3 mb-6"></div>
                    </div>
                    <a href="./games/sniper-elite-resistance.html" class="mt-4 w-full text-center bg-slate-800 hover:bg-sky-600 text-slate-200 hover:text-white font-bold py-2.5 px-4 rounded-lg text-xs transition-all border border-slate-700 flex items-center justify-center gap-2">
                        <span>Open Resistance Tracker</span>
                        <i class="fa-solid fa-arrow-right text-[10px]"></i>
                    </a>
                </div>
            </div>

            <!-- GHOST RECON WILDLANDS MATRIX -->
            <div id="module-grw" class="hidden mt-10 custom-card p-8 border border-red-600/40 shadow-red-950/20 shadow-2xl">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-red-900/50 pb-4 gap-4">
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="text-[10px] font-black uppercase tracking-wider bg-red-600/20 text-red-400 border border-red-500/40 px-2.5 py-0.5 rounded">Tom Clancy's Ghost Recon</span>
                            <span class="text-xs font-mono text-slate-400">Wildlands Operative Telemetry</span>
                        </div>
                        <h3 class="text-2xl font-black text-white mt-1">Ghost Recon: Wildlands Matrix</h3>
                    </div>
                    <a href="./games/ghost-recon-wildlands.html" class="bg-red-600 hover:bg-red-500 text-white font-bold text-xs py-2 px-5 rounded-lg border border-red-400 transition-all flex items-center gap-2">
                        <span>Launch Wildlands Portal</span>
                        <i class="fa-solid fa-up-right-from-square text-[10px]"></i>
                    </a>
                </div>

                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr class="border-b border-slate-700 text-slate-400 font-black uppercase text-[11px]">
                                <th class="py-3 px-4 bg-slate-900/80 w-1/3 min-w-[220px]">Progression Metric / Category</th>
                                <th id="grw-col-werewolf" class="py-3 px-4 text-orange-400 min-w-[150px]">Werewolf3788</th>
                                <th id="grw-col-marc" class="py-3 px-4 text-emerald-400 min-w-[150px]">Marc</th>
                                <th id="grw-col-ray" class="py-3 px-4 text-red-400 min-w-[150px]">Raymystyro</th>
                                <th id="grw-col-tj" class="py-3 px-4 text-purple-400 min-w-[150px]">terrdog420</th>
                            </tr>
                        </thead>
                        <tbody id="grw-matrix-body" class="divide-y divide-slate-800/60 font-medium text-slate-300">
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </section>
    `;
}

function renderSettingsView() {
    return `
    <section class="max-w-5xl w-full mx-auto px-4 py-8 flex-grow">
        <div class="mb-8 border-b border-slate-800 pb-4">
            <h1 class="text-3xl font-black text-sky-400 flex items-center gap-3">
                <i class="fa-solid fa-sliders text-2xl"></i>
                <span>Operator Profile &amp; Control Settings</span>
            </h1>
            <p class="text-slate-400 text-sm mt-1">Configure your operator handle, theme accents, cross-platform gamertags, and account linkages.</p>
        </div>

        <form id="settingsForm" class="space-y-8">
            
            <!-- CARD 1: Operator Identity -->
            <div class="custom-card p-6 border border-slate-700">
                <div class="flex items-center gap-3 border-b border-slate-700/60 pb-3 mb-6">
                    <i class="fa-solid fa-id-card text-sky-400 text-lg"></i>
                    <h2 class="text-lg font-bold text-white">1. Operator Identity</h2>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label class="block text-xs font-black uppercase text-slate-300 tracking-wider mb-2">
                            Operator Profile Name <span class="text-amber-400">*</span>
                        </label>
                        <input type="text" id="operatorNameInput" required placeholder="e.g. Werewolf3788" class="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 px-4 text-sm text-white focus:outline-none focus:border-sky-400 transition-colors">
                        <p class="text-[11px] text-slate-500 mt-1 italic">This is your primary identifier across game trackers and leaderboard matrices.</p>
                    </div>

                    <div>
                        <label class="block text-xs font-black uppercase text-slate-300 tracking-wider mb-2">
                            Custom Avatar Image URL
                        </label>
                        <input type="url" id="avatarUrlInput" placeholder="https://..." class="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 px-4 text-sm text-white focus:outline-none focus:border-sky-400 transition-colors">
                        <p class="text-[11px] text-slate-500 mt-1 italic">Leave blank to default to your Google profile photo.</p>
                    </div>
                </div>
            </div>

            <!-- CARD 2: Custom Page Theme & Colors -->
            <div class="custom-card p-6 border border-slate-700">
                <div class="flex items-center gap-3 border-b border-slate-700/60 pb-3 mb-6">
                    <i class="fa-solid fa-palette text-amber-500 text-lg"></i>
                    <h2 class="text-lg font-bold text-white">2. Visual Theme &amp; Accent Customization</h2>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                    <div>
                        <label class="block text-xs font-black uppercase text-slate-300 tracking-wider mb-2">Primary Accent Color</label>
                        <div class="flex items-center gap-3">
                            <input type="color" id="primaryColorInput" value="#ff5f1f" class="w-12 h-10 bg-slate-900 border border-slate-700 rounded cursor-pointer p-0.5">
                            <span id="primaryHexLabel" class="font-mono text-xs text-slate-300">#FF5F1F</span>
                        </div>
                    </div>

                    <div>
                        <label class="block text-xs font-black uppercase text-slate-300 tracking-wider mb-2">Secondary Accent Color</label>
                        <div class="flex items-center gap-3">
                            <input type="color" id="secondaryColorInput" value="#38bdf8" class="w-12 h-10 bg-slate-900 border border-slate-700 rounded cursor-pointer p-0.5">
                            <span id="secondaryHexLabel" class="font-mono text-xs text-slate-300">#38BDF8</span>
                        </div>
                    </div>

                    <!-- Live Theme Preview Box -->
                    <div id="themePreviewBox" class="p-4 rounded-xl border border-slate-700 bg-slate-900/90 text-center space-y-2">
                        <div class="text-[10px] font-black uppercase tracking-widest text-slate-400">Live Card Preview</div>
                        <div class="text-sm font-black text-primary-dynamic">Operator Theme Active</div>
                        <div class="text-xs font-semibold text-secondary-dynamic">Secondary Highlight Line</div>
                        <button type="button" class="btn-primary-dynamic text-[11px] font-bold py-1 px-3 rounded shadow">Sample Button</button>
                    </div>
                </div>
            </div>

            <!-- CARD 3: Multi-Platform Gamertags -->
            <div class="custom-card p-6 border border-slate-700">
                <div class="flex items-center gap-3 border-b border-slate-700/60 pb-3 mb-6">
                    <i class="fa-solid fa-gamepad text-emerald-400 text-lg"></i>
                    <h2 class="text-lg font-bold text-white">3. Multi-Platform Gamertags</h2>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div>
                        <label class="block text-xs font-black uppercase text-slate-300 tracking-wider mb-2 flex items-center gap-2">
                            <i class="fa-brands fa-playstation text-blue-500"></i>
                            <span>PlayStation Network (PSN)</span>
                        </label>
                        <input type="text" id="psnTagInput" placeholder="e.g. Werewolf3788" class="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 px-4 text-sm text-white focus:outline-none focus:border-sky-400 transition-colors">
                    </div>

                    <div>
                        <label class="block text-xs font-black uppercase text-slate-300 tracking-wider mb-2 flex items-center gap-2">
                            <i class="fa-brands fa-xbox text-emerald-500"></i>
                            <span>Xbox Live Gamertag</span>
                        </label>
                        <input type="text" id="xboxTagInput" placeholder="e.g. Werewolf3788" class="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 px-4 text-sm text-white focus:outline-none focus:border-sky-400 transition-colors">
                    </div>

                    <div>
                        <label class="block text-xs font-black uppercase text-slate-300 tracking-wider mb-2 flex items-center gap-2">
                            <i class="fa-brands fa-steam text-slate-300"></i>
                            <span>Steam ID / Vanity URL</span>
                        </label>
                        <input type="text" id="steamTagInput" placeholder="e.g. 76561198000000000" class="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 px-4 text-sm text-white focus:outline-none focus:border-sky-400 transition-colors">
                    </div>

                    <div>
                        <label class="block text-xs font-black uppercase text-slate-300 tracking-wider mb-2 flex items-center gap-2">
                            <i class="fa-solid fa-bolt text-purple-400"></i>
                            <span>Epic Games Display Name</span>
                        </label>
                        <input type="text" id="epicTagInput" placeholder="e.g. Werewolf_Epic" class="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 px-4 text-sm text-white focus:outline-none focus:border-sky-400 transition-colors">
                    </div>

                    <div>
                        <label class="block text-xs font-black uppercase text-slate-300 tracking-wider mb-2 flex items-center gap-2">
                            <i class="fa-solid fa-e text-red-500 font-black"></i>
                            <span>EA App / Origin ID</span>
                        </label>
                        <input type="text" id="eaTagInput" placeholder="e.g. Werewolf_EA" class="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 px-4 text-sm text-white focus:outline-none focus:border-sky-400 transition-colors">
                    </div>

                    <div>
                        <label class="block text-xs font-black uppercase text-slate-300 tracking-wider mb-2 flex items-center gap-2">
                            <i class="fa-solid fa-circle-notch text-sky-400"></i>
                            <span>Ubisoft Connect Username</span>
                        </label>
                        <input type="text" id="ubisoftTagInput" placeholder="e.g. Werewolf_Ubi" class="w-full bg-slate-900 border border-slate-700 rounded-lg py-2.5 px-4 text-sm text-white focus:outline-none focus:border-sky-400 transition-colors">
                    </div>
                </div>
            </div>

            <!-- CARD 4: Linked Authentication Accounts -->
            <div class="custom-card p-6 border border-slate-700">
                <div class="flex items-center justify-between border-b border-slate-700/60 pb-3 mb-6">
                    <div class="flex items-center gap-3">
                        <i class="fa-solid fa-link text-purple-400 text-lg"></i>
                        <h2 class="text-lg font-bold text-white">4. Linked Authentication Accounts</h2>
                    </div>
                    <span class="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                        FIREBASE AUTO-SYNC
                    </span>
                </div>

                <div id="dynamicProvidersList" class="space-y-4">
                    <div class="text-xs text-slate-400 italic text-center py-4 bg-slate-900/40 rounded-xl border border-slate-800">
                        Sign in to view your connected authentication accounts.
                    </div>
                </div>

                <div id="linkNewAccountContainer" class="hidden mt-4 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div class="text-xs text-slate-400">
                        <span class="font-bold text-slate-200">Want to connect another login method?</span> Select a provider to link it to your profile.
                    </div>
                    <div class="flex items-center gap-2 w-full sm:w-auto">
                        <select id="linkProviderSelect" class="bg-slate-900 border border-slate-700 text-xs text-white rounded-lg py-2 px-3 focus:outline-none focus:border-sky-400">
                            <option value="google.com">Google</option>
                            <option value="facebook.com">Facebook</option>
                            <option value="github.com">GitHub</option>
                            <option value="twitter.com">Twitter / X</option>
                        </select>
                        <button type="button" id="triggerLinkBtn" class="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-4 rounded-lg border border-emerald-400 transition-all shrink-0 flex items-center gap-1.5 cursor-pointer">
                            <i class="fa-solid fa-plus text-[10px]"></i>
                            <span>Link Account</span>
                        </button>
                    </div>
                </div>

                <div class="mt-6 pt-4 border-t border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div class="flex items-center gap-3">
                        <i class="fa-solid fa-shield-halved text-sky-400 text-lg"></i>
                        <div>
                            <div class="text-xs font-bold text-white">Data Privacy &amp; Encryption Standards</div>
                            <div class="text-[11px] text-slate-400">Read our official data handling and credentials privacy policy documentation.</div>
                        </div>
                    </div>
                    <a href="https://github.com/Werewolf3788/Website/blob/main/security/privacy.html" target="_blank" rel="noopener noreferrer" class="text-sky-400 hover:text-sky-300 text-xs font-bold underline flex items-center gap-1.5 shrink-0">
                        <span>View Privacy Policy</span>
                        <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                    </a>
                </div>
            </div>

            <!-- Submit Controls -->
            <div class="flex items-center justify-between pt-4">
                <span id="saveStatusMessage" class="text-xs font-mono font-bold text-emerald-400"></span>
                <button type="submit" id="saveSettingsBtn" class="btn-primary-dynamic font-black text-sm py-3 px-8 rounded-xl shadow-lg border border-white/20 transition-all flex items-center gap-2 cursor-pointer">
                    <i class="fa-solid fa-floppy-disk"></i>
                    <span>Save Operator Profile Settings</span>
                </button>
            </div>

        </form>
    </section>
    `;
}

function renderNotFoundView() {
    return `
    <div class="section-padding text-center flex-grow flex flex-col items-center justify-center">
        <h1 class="text-6xl text-sky-400 font-black mb-4">404</h1>
        <p class="text-slate-300 text-lg mb-6">Page view not found inside Werewolf Project SPA.</p>
        <a href="#/" class="bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-6 rounded-lg border border-sky-400 transition-all">
            Return Home
        </a>
    </div>
    `;
}

/* === SECTION: Router Engine === */
const routes = {
    '/': renderHomeView,
    '#/': renderHomeView,
    '#/settings': renderSettingsView,
    'settings.html': renderSettingsView
};

function router() {
    const viewContainer = document.getElementById('app-view');
    if (!viewContainer) return;

    let hash = window.location.hash || '#/';
    
    // Normalize settings route access
    if (window.location.pathname.endsWith('settings.html')) {
        hash = '#/settings';
    }

    const viewFn = routes[hash] || renderNotFoundView;
    viewContainer.innerHTML = viewFn();

    // Trigger post-render initializers depending on active view
    if (hash === '#/' || hash === '') {
        refreshData();
        if (db) attachSmartGameProgressListeners(db);
    } else if (hash === '#/settings') {
        initSettingsEventListeners();
        if (currentUser) loadUserSettingsToForm(currentUser);
        renderSmartProviders(currentUser);
    }
}

window.addEventListener('hashchange', router);

/* === SECTION: Settings Event Handlers & Theme Logic === */
function setGamertagCookie(gamertag) {
    const d = new Date();
    d.setTime(d.getTime() + (365 * 24 * 60 * 60 * 1000));
    document.cookie = `cotw_active_gamertag=${encodeURIComponent(gamertag)};expires=${d.toUTCString()};path=/;SameSite=Lax`;
    document.cookie = `se5_active_gamertag=${encodeURIComponent(gamertag)};expires=${d.toUTCString()};path=/;SameSite=Lax`;
}

function applyDynamicTheme(primary, secondary) {
    const p = primary || '#ff5f1f';
    const s = secondary || '#38bdf8';
    document.documentElement.style.setProperty('--primary-color', p);
    document.documentElement.style.setProperty('--secondary-color', s);
    
    const pLabel = document.getElementById('primaryHexLabel');
    const sLabel = document.getElementById('secondaryHexLabel');
    if (pLabel) pLabel.innerText = p.toUpperCase();
    if (sLabel) sLabel.innerText = s.toUpperCase();

    localStorage.setItem('user_primary_color', p);
    localStorage.setItem('user_secondary_color', s);
}

function initSettingsEventListeners() {
    const pInput = document.getElementById('primaryColorInput');
    const sInput = document.getElementById('secondaryColorInput');

    pInput?.addEventListener('input', (e) => {
        applyDynamicTheme(e.target.value, sInput ? sInput.value : '#38bdf8');
    });

    sInput?.addEventListener('input', (e) => {
        applyDynamicTheme(pInput ? pInput.value : '#ff5f1f', e.target.value);
    });

    document.getElementById("triggerLinkBtn")?.addEventListener("click", async () => {
        if (!currentUser) return;
        const selectedProviderId = document.getElementById("linkProviderSelect").value;
        const meta = PROVIDER_METADATA[selectedProviderId];

        if (!meta) return;

        if (currentUser.providerData.some(p => p.providerId === selectedProviderId)) {
            alert(`${meta.name} is already connected to your profile!`);
            return;
        }

        try {
            const providerInstance = meta.getProvider();
            await linkWithPopup(currentUser, providerInstance);
            alert(`Successfully connected ${meta.name}!`);
            renderSmartProviders(auth.currentUser);
        } catch (err) {
            if (err.code === 'auth/operation-not-allowed') {
                alert(`${meta.name} is not enabled in your Firebase Console yet.`);
            } else if (err.code === 'auth/credential-already-in-use') {
                alert(`This ${meta.name} account is already linked to another Operator profile.`);
            } else {
                console.error("Linking Error:", err);
                alert("Linking failed: " + err.message);
            }
        }
    });

    document.getElementById('settingsForm')?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const operatorName = document.getElementById('operatorNameInput').value.trim();
        if (!operatorName) {
            alert("Please enter a valid Operator Profile Name.");
            return;
        }

        const cleanHandle = USER_DATA_MAP[operatorName] || operatorName;
        const primaryColor = document.getElementById('primaryColorInput').value;
        const secondaryColor = document.getElementById('secondaryColorInput').value;
        const avatarUrl = document.getElementById('avatarUrlInput').value.trim();

        const gamertags = {
            psn: document.getElementById('psnTagInput').value.trim(),
            xbox: document.getElementById('xboxTagInput').value.trim(),
            steam: document.getElementById('steamTagInput').value.trim(),
            epic: document.getElementById('epicTagInput').value.trim(),
            ea: document.getElementById('eaTagInput').value.trim(),
            ubisoft: document.getElementById('ubisoftTagInput').value.trim()
        };

        const payload = {
            displayName: cleanHandle,
            operatorProfileName: cleanHandle,
            primaryColor,
            secondaryColor,
            photoURL: avatarUrl || (currentUser ? currentUser.photoURL : ""),
            email: currentUser ? currentUser.email : "",
            uid: currentUser ? currentUser.uid : "anonymous",
            gamertags,
            lastUpdated: new Date().toISOString()
        };

        setGamertagCookie(cleanHandle);
        applyDynamicTheme(primaryColor, secondaryColor);

        if (db) {
            try {
                const userDocRef = doc(db, 'users', cleanHandle);
                await setDoc(userDocRef, payload, { merge: true });

                const msg = document.getElementById('saveStatusMessage');
                if (msg) {
                    msg.innerText = "✓ Settings Saved Cleanly to Firestore!";
                    setTimeout(() => { msg.innerText = ""; }, 4000);
                }
            } catch (err) {
                console.error("Firestore Save Error:", err);
                alert("Error saving settings: " + err.message);
            }
        } else {
            alert("Saved locally to cookies (Database Offline).");
        }
    });
}

async function loadUserSettingsToForm(user) {
    if (!user) return;
    const rawName = user.displayName || user.email.split('@')[0];
    const operatorHandle = USER_DATA_MAP[rawName] || rawName;

    const opInput = document.getElementById('operatorNameInput');
    if (opInput) opInput.value = operatorHandle;

    try {
        const userDocRef = doc(db, 'users', operatorHandle);
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
            const data = snap.data();
            if (data.photoURL) document.getElementById('avatarUrlInput').value = data.photoURL;
            if (data.primaryColor) document.getElementById('primaryColorInput').value = data.primaryColor;
            if (data.secondaryColor) document.getElementById('secondaryColorInput').value = data.secondaryColor;
            
            if (data.gamertags) {
                if (document.getElementById('psnTagInput')) document.getElementById('psnTagInput').value = data.gamertags.psn || "";
                if (document.getElementById('xboxTagInput')) document.getElementById('xboxTagInput').value = data.gamertags.xbox || "";
                if (document.getElementById('steamTagInput')) document.getElementById('steamTagInput').value = data.gamertags.steam || "";
                if (document.getElementById('epicTagInput')) document.getElementById('epicTagInput').value = data.gamertags.epic || "";
                if (document.getElementById('eaTagInput')) document.getElementById('eaTagInput').value = data.gamertags.ea || "";
                if (document.getElementById('ubisoftTagInput')) document.getElementById('ubisoftTagInput').value = data.gamertags.ubisoft || "";
            }

            applyDynamicTheme(data.primaryColor, data.secondaryColor);
        }
    } catch (e) {
        console.warn("Could not load saved settings:", e.message);
    }
}

function renderSmartProviders(user) {
    const listContainer = document.getElementById("dynamicProvidersList");
    const linkContainer = document.getElementById("linkNewAccountContainer");
    if (!listContainer) return;

    if (!user) {
        listContainer.innerHTML = `
            <div class="text-xs text-slate-400 italic text-center py-4 bg-slate-900/40 rounded-xl border border-slate-800">
                Sign in to view your connected authentication accounts.
            </div>`;
        if (linkContainer) linkContainer.classList.add("hidden");
        return;
    }

    if (linkContainer) linkContainer.classList.remove("hidden");

    let html = '';
    user.providerData.forEach(p => {
        const meta = PROVIDER_METADATA[p.providerId] || {
            name: p.providerId,
            icon: 'fa-solid fa-key text-emerald-400'
        };

        html += `
            <div class="flex items-center justify-between p-4 bg-slate-900/60 rounded-xl border border-slate-800">
                <div class="flex items-center gap-3">
                    <i class="${meta.icon} text-xl w-6 text-center"></i>
                    <div>
                        <div class="text-sm font-bold text-white">${meta.name}</div>
                        <div class="text-xs text-emerald-400 font-semibold">
                            Connected (${p.email || p.displayName || 'Active'})
                        </div>
                    </div>
                </div>

                <div>
                    <button type="button" onclick="window.unlinkProvider('${p.providerId}')" 
                            class="bg-slate-800 hover:bg-red-900/40 text-slate-300 hover:text-red-300 border border-slate-700 hover:border-red-500/50 text-xs font-bold py-1.5 px-3 rounded-lg transition-all cursor-pointer ${user.providerData.length <= 1 ? 'opacity-50 cursor-not-allowed' : ''}"
                            ${user.providerData.length <= 1 ? 'disabled title="Cannot unlink primary login method"' : ''}>
                        Unlink
                    </button>
                </div>
            </div>
        `;
    });

    listContainer.innerHTML = html;
}

window.unlinkProvider = async function(providerId) {
    if (!currentUser) return;
    if (currentUser.providerData.length <= 1) {
        alert("You must keep at least one login method connected to your profile.");
        return;
    }

    if (confirm(`Are you sure you want to disconnect ${providerId}?`)) {
        try {
            await unlink(currentUser, providerId);
            alert(`Disconnected ${providerId} cleanly.`);
            renderSmartProviders(auth.currentUser);
        } catch (err) {
            console.error("Unlink Error:", err);
            alert("Error disconnecting account: " + err.message);
        }
    }
};

/* === SECTION: Helpers & Weather Engine === */
const users = [
    { id: 'werewolf', user: 'werewolf3788', lat: 29.6516, lon: -82.3248, cardId: 'card-werewolf', layerId: 'layer-werewolf', descId: 'weather-desc-werewolf', twitch: 'werewolf3788', theme: 'text-werewolf' },
    { id: 'ray', user: 'raymystyro', lat: 38.6689, lon: -88.4851, cardId: 'card-ray', layerId: 'layer-ray', descId: 'weather-desc-ray', twitch: 'raymystyro', theme: 'text-ray' },
    { id: 'tj', user: 'terrdog420', lat: 42.1614, lon: -93.3033, cardId: 'card-tj', layerId: 'layer-tj', descId: 'weather-desc-tj', twitch: 'terrdog420', theme: 'text-terrdog' }
];

window.toggleMobileMenu = function() {
    const menu = document.getElementById('mobile-menu');
    const icon = document.getElementById('menu-icon');
    if (menu && icon) {
        menu.classList.toggle('hidden');
        icon.classList.toggle('fa-bars');
        icon.classList.toggle('fa-xmark');
    }
};

async function fetchWithRetry(url, options = {}) {
    let delay = 1000;
    for (let i = 0; i < 5; i++) {
        try {
            const response = await fetch(url, options);
            if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
            return response;
        } catch (error) {
            if (i === 4) throw error;
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
        }
    }
}

/* === SECTION: Dynamic Nav Engine (Strict Exact Title & Filename Match) === */
const navCsvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS7s86dWkDdx-SomMJamUCFEEsQEpgcPBxUFmanAuYrWqqVSfDqOEhgLs1hZfLRFOPK7vLFeXKcMXqK/pub?output=csv';

function isUrlActive(itemUrl, itemName) {
    if (!itemUrl || itemUrl === '#') return false;

    const currentHash = window.location.hash || '#/';
    const cleanItemUrl = itemUrl.trim().toLowerCase();

    // Exact hash route match
    if (cleanItemUrl === currentHash.toLowerCase()) return true;

    // Strict filename match
    const targetFilename = cleanItemUrl.substring(cleanItemUrl.lastIndexOf('/') + 1);
    const currentPath = window.location.pathname.toLowerCase();
    const currentFilename = currentPath.substring(currentPath.lastIndexOf('/') + 1) || 'index.html';

    if (targetFilename && targetFilename === currentFilename) return true;

    // Strict title match against document.title
    if (itemName && itemName.trim().length > 0) {
        const pageTitle = document.title.toLowerCase();
        const cleanItemName = itemName.toLowerCase().trim();
        const titleTokens = pageTitle.split(/[\s|–—\-\:]+/).filter(t => t.length > 0);
        if (titleTokens.includes(cleanItemName)) return true;
    }

    return false;
}

async function fetchNavData() {
    try {
        const response = await fetchWithRetry(navCsvUrl);
        const data = await response.text();
        const rows = data.split(/\r?\n/).filter(line => line.trim() !== "");

        const navOrder = [];
        const groupIndexMap = {};

        for (let i = 1; i < rows.length; i++) {
            const columns = parseCSVLine(rows[i]);
            if (columns.length >= 3) {
                const name = columns[0] ? columns[0].trim() : '';
                if (!name) continue;
                
                const group = columns[1] ? columns[1].trim() : '';
                let url = columns[2] ? columns[2].trim() : '#';
                const img = columns[3] ? columns[3].trim() : '';

                if (url.endsWith('settings.html')) url = '#/settings';

                const item = { name, url, img };

                if (group === '') {
                    navOrder.push({ type: 'standalone', data: item });
                } else {
                    if (groupIndexMap[group] === undefined) {
                        groupIndexMap[group] = navOrder.length;
                        navOrder.push({ type: 'group', name: group, items: [] });
                    }
                    navOrder[groupIndexMap[group]].items.push(item);
                }
            }
        }
        renderNav(navOrder);
    } catch (error) {
        console.error("Failed to fetch navigation data:", error);
        const desktop = document.getElementById('desktop-nav-links');
        if (desktop) desktop.innerHTML = `<span class="text-red-400 text-sm">Navigation offline</span>`;
    }
}

function renderNav(navOrder) {
    const desktopContainer = document.getElementById('desktop-nav-links');
    const mobileContainer = document.getElementById('mobile-nav-links');
    if (!desktopContainer || !mobileContainer) return;

    let desktopHTML = '';
    let mobileHTML = '';

    navOrder.forEach(node => {
        if (node.type === 'standalone') {
            const item = node.data;
            const active = isUrlActive(item.url, item.name);
            const textClass = active ? 'text-yellow-400 font-black border-b-2 border-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]' : 'text-white hover:text-yellow-400';
            const imgTag = item.img ? `<img src="${item.img}" class="w-5 h-5 rounded-full object-cover">` : '';

            desktopHTML += `
                <a href="${item.url}" class="nav-link flex items-center gap-2 ${textClass} transition-colors">
                    ${imgTag}<span>${item.name}</span>
                </a>
            `;

            mobileHTML += `
                <a href="${item.url}" class="flex items-center gap-2 px-3 py-2 rounded-md ${textClass} hover:bg-slate-800">
                    ${imgTag}<span>${item.name}</span>
                </a>
            `;
        } else if (node.type === 'group') {
            const hasActiveChild = node.items.some(item => isUrlActive(item.url, item.name));
            const groupBtnClasses = hasActiveChild ? 'text-yellow-400 font-black border-b-2 border-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]' : 'text-white hover:text-yellow-400';

            desktopHTML += `
            <div class="relative group dropdown">
                <button class="flex items-center space-x-1 ${groupBtnClasses} focus:outline-none py-4">
                    <span>${node.name}</span>
                    <i class="fa-solid fa-chevron-down text-xs opacity-70"></i>
                </button>
                <div class="dropdown-menu hidden absolute left-0 w-64 mt-0 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 z-50">
            `;
            
            mobileHTML += `<div class="px-3 py-2 mt-2 text-sky-400 font-bold uppercase text-xs tracking-wider border-b border-slate-700/50">${node.name}</div>`;

            node.items.forEach(item => {
                const active = isUrlActive(item.url, item.name);
                const itemClasses = active ? 'text-yellow-400 font-black bg-slate-700/80' : 'text-white hover:bg-slate-700 hover:text-yellow-400';
                const imgTag = item.img ? `<img src="${item.img}" class="w-5 h-5 rounded-md object-cover border border-slate-600">` : '';
                
                desktopHTML += `
                    <a href="${item.url}" class="flex items-center gap-3 px-4 py-3 text-sm ${itemClasses} transition-colors">
                        ${imgTag}<span>${item.name}</span>
                    </a>
                `;

                mobileHTML += `
                    <a href="${item.url}" class="flex items-center gap-3 px-3 py-2 pl-6 rounded-md text-sm ${itemClasses} hover:bg-slate-800">
                        ${imgTag}<span>${item.name}</span>
                    </a>
                `;
            });

            desktopHTML += `</div></div>`;
        }
    });

    desktopContainer.innerHTML = desktopHTML;
    mobileContainer.innerHTML = mobileHTML;
}

/* === SECTION: Movies & Weather Engines === */
let cinemaImages = [];
let currentSlideIndex = 0;
let activeBgId = 1;
let cinemaInterval;

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' && line[i+1] === '"') {
            current += '"'; i++;
        } else if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

async function fetchMovieData() {
    const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRbnwK6U18P1u1eAS8a_PqZzpOKxQ9AATL6RBH7CfxXQR10YPM63akRqxSDbNiXYJWs92tvobh6iqE7/pub?output=csv';
    const countDisplay = document.getElementById('movie-count');

    try {
        const response = await fetchWithRetry(csvUrl);
        const data = await response.text();
        const rows = data.split(/\r?\n/).filter(line => line.trim() !== "");
        let validMovieCount = 0;
        cinemaImages = [];

        for (let i = 1; i < rows.length; i++) {
            const columns = parseCSVLine(rows[i]);
            if (columns.length > 0 && columns[0].trim() !== '') {
                validMovieCount++;
                if (columns.length > 1 && columns[1] && columns[1].startsWith('http')) {
                    cinemaImages.push(columns[1]);
                }
            }
        }

        if (countDisplay) countDisplay.textContent = validMovieCount.toLocaleString();
        localStorage.setItem('werewolf_library_count', validMovieCount);

        if (cinemaImages.length > 0) {
            cinemaImages.sort(() => 0.5 - Math.random());
            startCinemaSlideshow();
        }
    } catch (error) {
        console.error('Error fetching library data:', error);
        if (countDisplay) countDisplay.textContent = 'Service unavailable';
    }
}

function startCinemaSlideshow() {
    if (cinemaImages.length === 0 || cinemaInterval) return;
    const layer1 = document.getElementById('cinema-layer-1');
    const layer2 = document.getElementById('cinema-layer-2');
    if (!layer1 || !layer2) return;
    
    const setSlideImage = (layer, url) => {
        layer.querySelectorAll('div').forEach(el => {
            el.style.backgroundImage = `url('${url}')`;
        });
    };

    setSlideImage(layer1, cinemaImages[0]);
    layer1.style.opacity = 1;
    layer2.style.opacity = 0;

    cinemaInterval = setInterval(() => {
        currentSlideIndex = (currentSlideIndex + 1) % cinemaImages.length;
        const nextImgUrl = cinemaImages[currentSlideIndex];

        if (activeBgId === 1) {
            setSlideImage(layer2, nextImgUrl);
            layer2.style.opacity = 1;
            layer1.style.opacity = 0;
            activeBgId = 2;
        } else {
            setSlideImage(layer1, nextImgUrl);
            layer1.style.opacity = 1;
            layer2.style.opacity = 0;
            activeBgId = 1;
        }
    }, 6000);
}

async function updateWeather() {
    for (const u of users) {
        try {
            const response = await fetchWithRetry(`https://api.open-meteo.com/v1/forecast?latitude=${u.lat}&longitude=${u.lon}&current_weather=true&temperature_unit=fahrenheit`);
            const data = await response.json();
            const code = data.current_weather.weathercode;
            const temp = Math.round(data.current_weather.temperature);
            
            let type = 'clear', desc = 'Clear Skies';
            if (code === 0) { type = 'sunny'; desc = 'Sunny'; }
            else if (code >= 1 && code <= 3) { type = 'cloudy'; desc = 'Partly Cloudy'; }
            else if (code >= 45 && code <= 48) { type = 'cloudy'; desc = 'Foggy'; }
            else if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) { type = 'rain'; desc = 'Raining'; }
            else if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) { type = 'snowy'; desc = 'Snowing'; }

            applyWeatherUI(u, type, `${desc} • ${temp}°F`);
        } catch (e) {
            const el = document.getElementById(u.descId);
            if (el) el.textContent = "Weather service unavailable";
        }
    }
}

function applyWeatherUI(user, type, description) {
    const card = document.getElementById(user.cardId);
    const layer = document.getElementById(user.layerId);
    const descText = document.getElementById(user.descId);
    if (!card || !layer || !descText) return;
    
    descText.textContent = description;
    card.classList.remove('bg-rain', 'bg-cloudy', 'bg-sunny', 'bg-snowy', 'bg-clear', 'is-sunny');
    card.classList.add(`bg-${type}`);
    if (type === 'sunny') card.classList.add('is-sunny');

    layer.innerHTML = '';
    layer.classList.add('active');

    if (type === 'rain') {
        for(let i=0; i<30; i++) {
            const drop = document.createElement('div');
            drop.className = 'rain-drop';
            drop.style.left = Math.random() * 100 + '%';
            drop.style.animationDuration = (Math.random() * 0.4 + 0.4) + 's';
            drop.style.animationDelay = Math.random() * 2 + 's';
            layer.appendChild(drop);
        }
    } else if (type === 'snowy') {
        const ground = document.createElement('div');
        ground.className = 'snow-ground';
        layer.appendChild(ground);
        for(let i=0; i<40; i++) {
            const flake = document.createElement('div');
            flake.className = 'snowflake';
            const size = Math.random() * 4 + 2 + 'px';
            flake.style.width = size; flake.style.height = size;
            flake.style.left = Math.random() * 100 + '%';
            flake.style.animationDuration = (Math.random() * 3 + 2) + 's';
            layer.appendChild(flake);
        }
    } else if (type === 'cloudy') {
        for(let i=0; i<3; i++) {
            const puff = document.createElement('div');
            puff.className = 'cloud-puff';
            puff.style.width = (Math.random() * 100 + 100) + 'px';
            puff.style.height = '60px';
            puff.style.top = Math.random() * 80 + '%';
            puff.style.left = Math.random() * 80 + '%';
            puff.style.animationDelay = (i * -3) + 's';
            layer.appendChild(puff);
        }
    } else if (type === 'sunny') {
        const sun = document.createElement('div');
        sun.className = 'sun-glow';
        layer.appendChild(sun);
    }
}

async function updateTwitchStatus(u) {
    const gameEl = document.getElementById(`twitch-game-${u.id}`);
    const statusIndicator = document.getElementById(`twitch-status-indicator-${u.id}`);
    if (!gameEl || !statusIndicator) return;

    try {
        const response = await fetchWithRetry(`https://decapi.me/twitch/game/${u.twitch}`);
        const gameName = await response.text();
        if (gameName && gameName.toLowerCase() !== 'offline') {
            gameEl.innerHTML = `<i class="fa-solid fa-gamepad mr-2"></i>Live: ${gameName}`;
            gameEl.className = `${u.theme} text-[10px] uppercase font-bold italic`;
            statusIndicator.classList.remove('hidden');
        } else {
            gameEl.textContent = 'Currently Offline';
            gameEl.className = 'text-slate-500 opacity-50 text-[10px]';
            statusIndicator.classList.add('hidden');
        }
    } catch (e) { 
        gameEl.textContent = 'Stream status unavailable';
        gameEl.className = 'text-slate-500 opacity-50 text-[10px]';
        statusIndicator.classList.add('hidden');
    }
}

/* === SECTION: Smart Telemetry Engine === */
const teamProfiles = [
    { name: 'Werewolf3788', dbDoc: 'Werewolf3788', color: '#ff8800' },
    { name: 'Marc', dbDoc: 'Marc', color: '#10b981' },
    { name: 'Raymystyro', dbDoc: 'Raymystyro', color: '#ff4444' },
    { name: 'terrdog420', dbDoc: 'terrdog420', color: '#a855f7' }
];

const grwMetricsKeys = [
    { label: 'Tier One Prestige Mode', key: 'tierOneStatus' },
    { label: 'Tier Level Countdown', key: 'tierLevel' },
    { label: 'Playstyle Title', key: 'playstyleTitle' },
    { label: 'Avg Kill Distance', key: 'avgKillDist' },
    { label: 'Tactical Precision', key: 'tacticalPrecision' },
    { label: 'Stealth Kills %', key: 'stealthKillsPct' },
    { label: 'Lifetime Duration', key: 'lifetimeDuration' },
    { label: 'Longest Shot', key: 'longestShot' },
    { label: 'Primary Favorite Weapon', key: 'primaryWeapon' },
    { label: 'Secondary Favorite Weapon', key: 'secondaryWeapon' },
    { label: 'Teammates Revived', key: 'teammatesRevived' },
    { label: 'Drone Deployment Time', key: 'droneTime' },
    { label: 'Map Discovered %', key: 'mapDiscovered' }
];

async function initFirebaseEngine() {
    try {
        app = initializeApp(firebaseConfig, 'Global-Home-App');
        auth = getAuth(app);
        db = getFirestore(app);
        rtdb = getDatabase(app);

        await setPersistence(auth, browserLocalPersistence);
        
        setupAuthUI();

        onAuthStateChanged(auth, (user) => {
            handleAuthStateChange(user);
        });

        attachSmartGameProgressListeners(db);

    } catch (e) {
        console.error("Firebase Auth/Firestore Init Error:", e);
    }
}

function setupAuthUI() {
    const googleBtn = document.getElementById("googleSignInBtn");
    const signOutBtn = document.getElementById("signOutBtn");
    const authActionBtn = document.getElementById("auth-action-btn");

    const handleLogin = () => {
        signInWithPopup(auth, googleProvider)
            .then((result) => console.log("Google Login Successful:", result.user.displayName))
            .catch((err) => console.error("Login Error:", err));
    };

    const handleLogout = () => {
        signOut(auth).then(() => console.log("User Logged Out"));
    };

    if (googleBtn) googleBtn.addEventListener("click", handleLogin);
    if (signOutBtn) signOutBtn.addEventListener("click", handleLogout);

    if (authActionBtn) {
        authActionBtn.addEventListener("click", () => {
            if (auth.currentUser) {
                handleLogout();
            } else {
                handleLogin();
            }
        });
    }
}

function handleAuthStateChange(user) {
    currentUser = user;
    const googleBtn = document.getElementById("googleSignInBtn");
    const userStatus = document.getElementById("userProfileStatus");
    const userAvatar = document.getElementById("userAvatar");
    const authBanner = document.getElementById("authBanner");
    const adminBadge = document.getElementById("adminBadge");
    const authActionBtn = document.getElementById("auth-action-btn");
    const adminElements = document.querySelectorAll(".admin-only");

    if (user) {
        console.log("Session Active:", user.email);
        if (googleBtn) googleBtn.style.display = "none";
        if (userStatus) {
            userStatus.style.display = "flex";
            userStatus.classList.remove("hidden");
        }
        if (userAvatar) userAvatar.src = user.photoURL || "https://placehold.co/32x32/1e293b/ff8800?text=U";
        if (authBanner) authBanner.style.display = "none";
        if (authActionBtn) authActionBtn.textContent = "Sign Out";

        adminElements.forEach(el => el.classList.remove("restricted-view"));

        if (user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
            if (adminBadge) adminBadge.classList.remove("hidden");
        } else {
            if (adminBadge) adminBadge.classList.add("hidden");
        }

        const activeUsername = user.displayName || user.email.split('@')[0];
        setDoc(doc(db, 'users', activeUsername), {
            displayName: activeUsername,
            email: user.email || "",
            photoURL: user.photoURL || "",
            uid: user.uid,
            isAdmin: user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase(),
            lastUpdated: new Date().toISOString()
        }, { merge: true });

        // Update settings form and provider list if user is on #/settings
        if (window.location.hash === '#/settings') {
            loadUserSettingsToForm(user);
            renderSmartProviders(user);
        }

    } else {
        console.log("View-Only Mode Active");
        if (googleBtn) googleBtn.style.display = "flex";
        if (userStatus) userStatus.style.display = "none";
        if (authBanner) authBanner.style.display = "block";
        if (adminBadge) adminBadge.classList.add("hidden");
        if (authActionBtn) authActionBtn.textContent = "Sign In with Google";

        adminElements.forEach(el => el.classList.add("restricted-view"));

        if (window.location.hash === '#/settings') {
            renderSmartProviders(null);
        }
    }
}

function attachSmartGameProgressListeners(database) {
    const liveData = {
        'sniper-elite-5': {},
        'thehunter-call-of-the-wild': {},
        'sniper-elite-resistance': {},
        'ghost-recon-wildlands': {}
    };

    teamProfiles.forEach(prof => {
        const docTargets = [prof.dbDoc];
        if (prof.name === 'Werewolf3788') docTargets.push('Kevin');
        if (prof.name === 'terrdog420') docTargets.push('TJ');
        if (prof.name === 'Raymystyro') docTargets.push('Ray');

        docTargets.forEach(docId => {
            onSnapshot(doc(database, 'users', docId, 'progress', 'sniper-elite-5'), (snap) => {
                if (snap.exists()) {
                    const d = snap.data();
                    const items = d.progress || d.trophies || [];
                    const done = items.filter(i => i.collected === true || i.done === true).length;
                    if (done > 0) {
                        liveData['sniper-elite-5'][prof.name] = { done, total: items.length || 202, color: prof.color };
                    }
                }
                evaluateModuleVisibility('sniper-elite-5', liveData['sniper-elite-5']);
            });

            onSnapshot(doc(database, 'users', docId, 'progress', 'thehunter-call-of-the-wild'), (snap) => {
                if (snap.exists()) {
                    const d = snap.data();
                    const items = d.trophies || d.progress || [];
                    let doneCount = 0;
                    items.forEach(t => {
                        if (t.type === 'checklist' && t.subItems) {
                            if (t.subItems.filter(s => s.done).length >= (t.goal || 1)) doneCount++;
                        } else if ((t.current || 0) >= (t.goal || 1) || t.done === true) {
                            doneCount++;
                        }
                    });

                    if (d.activeMapCategory && (prof.name === 'Werewolf3788' || docId === 'Kevin')) {
                        const badge = document.getElementById('cotw-active-map-name');
                        if (badge) badge.innerText = d.activeMapCategory.replace('DLC: ', '');
                    }

                    if (doneCount > 0) {
                        liveData['thehunter-call-of-the-wild'][prof.name] = { done: doneCount, total: items.length || 55, color: prof.color };
                    }
                }
                evaluateModuleVisibility('thehunter-call-of-the-wild', liveData['thehunter-call-of-the-wild']);
            });

            onSnapshot(doc(database, 'users', docId, 'progress', 'sniper-elite-resistance'), (snap) => {
                if (snap.exists()) {
                    const d = snap.data();
                    const items = d.progress || d.trophies || [];
                    const done = items.filter(i => i.collected === true || i.done === true).length;
                    if (done > 0) {
                        liveData['sniper-elite-resistance'][prof.name] = { done, total: items.length || 140, color: prof.color };
                    }
                }
                evaluateModuleVisibility('sniper-elite-resistance', liveData['sniper-elite-resistance']);
            });

            const wildlandsPaths = ['T.C.G.R.Wildlands', 'ghost-recon-wildlands'];
            wildlandsPaths.forEach(gameDocId => {
                onSnapshot(doc(database, 'users', docId, 'progress', gameDocId), (snap) => {
                    if (snap.exists()) {
                        const d = snap.data();
                        const payload = d.telemetry || d.stats || d;
                        
                        const hasValidMetrics = Object.keys(payload).some(k => 
                            k !== 'user' && k !== 'gameId' && k !== 'lastUpdated' && payload[k] !== null && payload[k] !== ''
                        );

                        if (hasValidMetrics) {
                            liveData['ghost-recon-wildlands'][prof.name] = payload;
                        }
                    }
                    evaluateGRWVisibility(liveData['ghost-recon-wildlands']);
                });
            });
        });
    });
}

function evaluateModuleVisibility(gameKey, userMap) {
    const userKeys = Object.keys(userMap);
    const modEl = gameKey === 'sniper-elite-5' ? document.getElementById('module-se5') :
                  gameKey === 'thehunter-call-of-the-wild' ? document.getElementById('module-cotw') :
                  document.getElementById('module-ser');

    if (!modEl) return;

    if (userKeys.length > 0) {
        modEl.classList.remove('hidden');
        modEl.classList.add('flex');
        if (gameKey === 'sniper-elite-5') renderSE5Progress(userMap);
        if (gameKey === 'thehunter-call-of-the-wild') renderCOTWProgress(userMap);
        if (gameKey === 'sniper-elite-resistance') renderSERProgress(userMap);
    } else {
        modEl.classList.add('hidden');
        modEl.classList.remove('flex');
    }
}

function evaluateGRWVisibility(grwMap) {
    const modEl = document.getElementById('module-grw');
    if (!modEl) return;
    const hasData = Object.keys(grwMap).length > 0;

    if (hasData) {
        modEl.classList.remove('hidden');
        renderGRWMatrixTable(grwMap);
    } else {
        modEl.classList.add('hidden');
    }
}

function renderSE5Progress(data) {
    const container = document.getElementById('se5-progress-container');
    if (!container) return;
    let html = '';
    Object.keys(data).forEach(u => {
        const info = data[u];
        const pct = info.total > 0 ? Math.round((info.done / info.total) * 100) : 0;
        html += `
            <div>
                <div class="flex justify-between items-center text-xs mb-1">
                    <span class="font-bold text-slate-200" style="color: ${info.color}">${u}</span>
                    <span class="font-mono text-[11px] text-slate-400">${info.done}/${info.total} (${pct}%)</span>
                </div>
                <div class="w-full bg-slate-900 rounded-full h-1.5 border border-slate-800 overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-500" style="width: ${pct}%; background-color: ${info.color};"></div>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function renderCOTWProgress(data) {
    const container = document.getElementById('cotw-progress-container');
    if (!container) return;
    let html = '';
    Object.keys(data).forEach(u => {
        const info = data[u];
        const pct = info.total > 0 ? Math.round((info.done / info.total) * 100) : 0;
        html += `
            <div>
                <div class="flex justify-between items-center text-xs mb-1">
                    <span class="font-bold text-slate-200" style="color: ${info.color}">${u}</span>
                    <span class="font-mono text-[11px] text-slate-400">${info.done}/${info.total} (${pct}%)</span>
                </div>
                <div class="w-full bg-slate-900 rounded-full h-1.5 border border-slate-800 overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-500" style="width: ${pct}%; background-color: ${info.color};"></div>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function renderSERProgress(data) {
    const container = document.getElementById('ser-progress-container');
    if (!container) return;
    let html = '';
    Object.keys(data).forEach(u => {
        const info = data[u];
        const pct = info.total > 0 ? Math.round((info.done / info.total) * 100) : 0;
        html += `
            <div>
                <div class="flex justify-between items-center text-xs mb-1">
                    <span class="font-bold text-slate-200" style="color: ${info.color}">${u}</span>
                    <span class="font-mono text-[11px] text-slate-400">${info.done}/${info.total} (${pct}%)</span>
                </div>
                <div class="w-full bg-slate-900 rounded-full h-1.5 border border-slate-800 overflow-hidden">
                    <div class="h-full rounded-full transition-all duration-500" style="width: ${pct}%; background-color: ${info.color};"></div>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function renderGRWMatrixTable(grwMap) {
    const tbody = document.getElementById('grw-matrix-body');
    if (!tbody) return;

    let tableHtml = '';

    grwMetricsKeys.forEach(metric => {
        tableHtml += `<tr class="hover:bg-slate-800/40 transition-colors">`;
        tableHtml += `<td class="py-2.5 px-4 font-bold text-slate-300 bg-slate-900/40 border-r border-slate-800/80">${metric.label}</td>`;

        teamProfiles.forEach(prof => {
            const uData = grwMap[prof.name] || {};
            const val = uData[metric.key] !== undefined ? uData[metric.key] : '--';
            
            let styledVal = `<span class="font-mono text-slate-300">${val}</span>`;
            if (metric.key === 'tierOneStatus' && val === 'Active') {
                styledVal = `<span class="bg-red-600/20 text-red-400 border border-red-500/40 font-black text-[10px] px-2 py-0.5 rounded uppercase">Tier One Active</span>`;
            }

            tableHtml += `<td class="py-2.5 px-4">${styledVal}</td>`;
        });

        tableHtml += `</tr>`;
    });

    tbody.innerHTML = tableHtml;
}

function refreshData() {
    fetchNavData();
    updateWeather();
    users.forEach(updateTwitchStatus);
    fetchMovieData(); 
}

/* === SECTION: Initialization === */
window.addEventListener('DOMContentLoaded', () => {
    // Restore saved theme colors on boot
    const savedPrimary = localStorage.getItem('user_primary_color');
    const savedSecondary = localStorage.getItem('user_secondary_color');
    if (savedPrimary || savedSecondary) {
        applyDynamicTheme(savedPrimary, savedSecondary);
    }

    router();
    initFirebaseEngine();
    setInterval(refreshData, 300000);
});
