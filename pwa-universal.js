// Line 1: Universal PWA, Telemetry, Hardware & Branding Core Engine
// [Smart Cache-Buster Time: 2026-10-10 01:53 EDT | Firebase Sync Target: /utm_links | Version: 7.0.0]

(function initUniversalEngine() {
  // Line 5: Master Configuration Constants
  const ENGINE_VERSION = "7.0.0";
  const GA_MEASUREMENT_ID = "G-L376P3NPY4";
  const DEFAULT_REPO_ICON = "//raw.githubusercontent.com/Werewolf3788/Website/refs/heads/main/Images/werewolf_movie_anywhere.jpg";
  const FIREBASE_BRAND_PATH = "/utm_links/Settings/0/image";

  /* ==========================================================
     SECTION 1: UTM ATTRIBUTION & URL CAPTURE ENGINE
     ========================================================== */
  // Line 14: Parse and persist incoming UTM marketing parameters
  function captureUTMParameters() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"];
      let hasNewUTM = false;
      const capturedUTMs = {};

      utmKeys.forEach(key => {
        if (urlParams.has(key)) {
          const val = urlParams.get(key);
          capturedUTMs[key] = val;
          hasNewUTM = true;
        }
      });

      if (hasNewUTM) {
        const payload = {
          params: capturedUTMs,
          landingPage: window.location.pathname,
          capturedAt: new Date().toISOString()
        };
        localStorage.setItem("werewolf_utm_attribution", JSON.stringify(payload));
        console.log("[UTM Engine] Inbound campaign captured and locked to localStorage:", capturedUTMs);
      }
    } catch (e) {
      console.warn("[UTM Engine] URL parsing warning:", e);
    }
  }
  captureUTMParameters();

  /* ==========================================================
     SECTION 2: GOOGLE ANALYTICS 4 TELEMETRY ENGINE
     ========================================================== */
  // Line 48: Dynamic injection with standalone PWA attribution
  if (GA_MEASUREMENT_ID && !window[`ga_loaded_${GA_MEASUREMENT_ID}`]) {
    window[`ga_loaded_${GA_MEASUREMENT_ID}`] = true;

    const gaScript = document.createElement("script");
    gaScript.async = true;
    gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
    document.head.appendChild(gaScript);

    window.dataLayer = window.dataLayer || [];
    function gtag() {
      window.dataLayer.push(arguments);
    }
    window.gtag = gtag;

    gtag("js", new Date());

    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

    // Line 67: Forward captured UTM parameters to GA config
    let savedAttribution = {};
    try {
      const stored = localStorage.getItem("werewolf_utm_attribution");
      if (stored) savedAttribution = JSON.parse(stored).params || {};
    } catch (e) {}

    gtag("config", GA_MEASUREMENT_ID, {
      page_title: document.title || "Werewolf Portal",
      page_location: window.location.href,
      app_platform: isStandalone ? "pwa_standalone" : "web_browser",
      campaign_source: savedAttribution.utm_source || undefined,
      campaign_medium: savedAttribution.utm_medium || undefined,
      campaign_name: savedAttribution.utm_campaign || undefined
    });
  }

  /* ==========================================================
     SECTION 3: UNIVERSAL DYNAMIC MANIFEST & SHORTCUTS ENGINE
     ========================================================== */
  // Line 88: Generate dynamic Blob manifest adapting to page & native OS shortcuts
  function injectDynamicManifest(customIconUrl) {
    const currentPath = window.location.pathname;
    const pageTitle = (document.title && document.title.trim() !== "") ? document.title.trim() : "Werewolf Hub";
    const shortName = pageTitle.length > 12 ? pageTitle.substring(0, 12).trim() : pageTitle;
    const activeIcon = customIconUrl || DEFAULT_REPO_ICON;

    const dynamicManifest = {
      name: pageTitle,
      short_name: shortName,
      description: `Universal Tactical Engine & Hub - ${pageTitle}`,
      start_url: currentPath,
      scope: "./",
      display: "standalone",
      orientation: "any",
      background_color: "#0b0f19",
      theme_color: "#151c27",
      icons: [
        {
          src: activeIcon,
          sizes: "192x192",
          type: "image/png",
          purpose: "any"
        },
        {
          src: activeIcon,
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable"
        }
      ],
      shortcuts: [
        {
          name: "Cinema Library",
          short_name: "Movies",
          description: "Open Multi-Platform Cinema Library",
          url: "./Movies.html",
          icons: [{ src: activeIcon, sizes: "192x192" }]
        },
        {
          name: "Tactical Companion",
          short_name: "WOTH2",
          description: "Open Way of the Hunter 2 Engine",
          url: "./woth2.html",
          icons: [{ src: activeIcon, sizes: "192x192" }]
        },
        {
          name: "Settings Hub",
          short_name: "Settings",
          description: "Open Security and Configuration Hub",
          url: "./security/settings.html",
          icons: [{ src: activeIcon, sizes: "192x192" }]
        }
      ]
    };

    try {
      const manifestBlob = new Blob([JSON.stringify(dynamicManifest, null, 2)], {
        type: "application/manifest+json"
      });
      const manifestURL = URL.createObjectURL(manifestBlob);

      let linkTag = document.querySelector('link[rel="manifest"]');
      if (!linkTag) {
        linkTag = document.createElement("link");
        linkTag.rel = "manifest";
        document.head.appendChild(linkTag);
      }
      linkTag.href = manifestURL;
    } catch (err) {
      console.warn("[Manifest Engine] Blob creation warning:", err);
    }
  }
  injectDynamicManifest();

  /* ==========================================================
     SECTION 4: HARDWARE, OS APIS & NATIVE CONTROLS
     ========================================================== */
  // Line 169: Native App Badging API helper
  function updateAppBadge(count) {
    if ("setAppBadge" in navigator) {
      if (typeof count === "number" && count > 0) {
        navigator.setAppBadge(count).catch(e => console.warn("[Badge] Set error:", e));
      } else {
        navigator.clearAppBadge().catch(e => console.warn("[Badge] Clear error:", e));
      }
    }
  }

  // Line 180: Screen Wake Lock Engine for Companion / Dashboard Mode
  let activeWakeLock = null;
  async function requestScreenWakeLock() {
    if ("wakeLock" in navigator) {
      try {
        activeWakeLock = await navigator.wakeLock.request("screen");
        console.log("[Wake Lock] Screen Wake Lock acquired successfully.");
        activeWakeLock.addEventListener("release", () => {
          console.log("[Wake Lock] Screen Wake Lock was released.");
          activeWakeLock = null;
        });
        return true;
      } catch (err) {
        console.warn("[Wake Lock] Failed to acquire lock:", err.name, err.message);
        return false;
      }
    }
    return false;
  }

  function releaseScreenWakeLock() {
    if (activeWakeLock !== null) {
      activeWakeLock.release().then(() => {
        activeWakeLock = null;
      });
    }
  }

  // Auto-reacquire wake lock when tab visibility changes back to visible
  document.addEventListener("visibilitychange", async () => {
    if (activeWakeLock !== null && document.visibilityState === "visible") {
      await requestScreenWakeLock();
    }
  });

  // Line 214: Web Share API wrapper with clipboard fallback
  async function triggerWebShare(shareData) {
    const data = shareData || {
      title: document.title,
      text: "Check out this engine hub on Werewolf Portal:",
      url: window.location.href
    };

    if (navigator.share && navigator.canShare && navigator.canShare(data)) {
      try {
        await navigator.share(data);
        console.log("[Share Engine] Native share dispatched successfully.");
        return true;
      } catch (err) {
        if (err.name !== "AbortError") {
          console.warn("[Share Engine] Share error:", err);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(data.url || window.location.href);
        showConnectivityToast("📋 Link copied to clipboard!");
        return true;
      } catch (clipErr) {
        alert("Share Link: " + (data.url || window.location.href));
      }
    }
    return false;
  }

  // Line 244: Storage Quota and Cache Diagnostics
  async function checkStorageDiagnostics() {
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        const usageMB = (estimate.usage / (1024 * 1024)).toFixed(2);
        const quotaMB = (estimate.quota / (1024 * 1024)).toFixed(2);
        const percentUsed = Math.round((estimate.usage / estimate.quota) * 100);
        console.log(`[Storage Gauge] Disk Usage: ${usageMB} MB / ${quotaMB} MB (${percentUsed}%)`);
        return { usageMB, quotaMB, percentUsed };
      } catch (e) {
        console.warn("[Storage Gauge] Estimate warning:", e);
      }
    }
    return null;
  }

  /* ==========================================================
     SECTION 5: SERVICE WORKER & IN-APP INSTALL PROMPT
     ========================================================== */
  // Line 264: Register root service worker
  let deferredInstallPrompt = null;
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js")
        .then(reg => console.log("[PWA Worker] Active scope:", reg.scope))
        .catch(err => console.warn("[PWA Worker] Registration error:", err));
    });
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    const installBtn = document.getElementById("pwaInstallBtn");
    if (installBtn) {
      installBtn.classList.remove("hidden");
      installBtn.style.display = "inline-flex";
    }
  });

  /* ==========================================================
     SECTION 6: DOM AUTOMATIONS, ROUTING, FOOTER & TOAST
     ========================================================== */
  // Line 287: Non-intrusive status toast for network & actions
  function showConnectivityToast(message, isWarning = false) {
    let toast = document.getElementById("universalStatusToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "universalStatusToast";
      toast.style.cssText = `
        position: fixed;
        bottom: 45px;
        left: 50%;
        transform: translateX(-50%);
        background: #151c27;
        color: #f0f4f8;
        padding: 8px 18px;
        border-radius: 20px;
        font-size: 0.82rem;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        box-shadow: 0 4px 15px rgba(0,0,0,0.6);
        border: 1px solid #273447;
        z-index: 99999;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: opacity 0.3s ease, transform 0.3s ease;
        opacity: 0;
        pointer-events: none;
      `;
      document.body.appendChild(toast);
    }

    toast.style.borderColor = isWarning ? "#e74c3c" : "#2ecc71";
    toast.textContent = message;
    toast.style.opacity = "1";
    toast.style.transform = "translateX(-50%) translateY(-5px)";

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(-50%) translateY(0)";
    }, 3200);
  }

  window.addEventListener("online", () => showConnectivityToast("📡 Back Online - Sync Restored", false));
  window.addEventListener("offline", () => showConnectivityToast("⚠️ Offline - Running on Cache & LocalStorage", true));

  // Line 331: Lightbox image sanitization (restrict alt descriptions to lightbox only)
  function sanitizeImageAltAttributes() {
    const images = document.querySelectorAll("img");
    images.forEach(img => {
      if (img.hasAttribute("alt") && img.getAttribute("alt").trim() !== "") {
        const altText = img.getAttribute("alt");
        img.setAttribute("data-lightbox-alt", altText);
        img.setAttribute("alt", ""); // Suppress visible browser alt overlays
      }
    });
  }

  // Line 343: Smart internal vs external link router with outbound GA4 tracking
  function enforceLinkStandards() {
    const links = document.querySelectorAll("a");
    const currentOrigin = window.location.origin;

    links.forEach(link => {
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;

      const isExternal = link.hostname && link.hostname !== window.location.hostname;

      if (isExternal) {
        link.setAttribute("target", "_blank");
        link.setAttribute("rel", "noopener noreferrer");

        link.addEventListener("click", () => {
          if (typeof window.gtag === "function") {
            window.gtag("event", "click", {
              event_category: "outbound",
              event_label: href,
              transport_type: "beacon"
            });
          }
        });
      } else {
        link.setAttribute("target", "_self");
      }
    });
  }

  // Line 374: Inject persistent 24-hour New York timestamp & version footer
  function injectPersistentNYFooter() {
    if (document.getElementById("universalNYFooter")) return;

    const footer = document.createElement("footer");
    footer.id = "universalNYFooter";
    footer.style.cssText = `
      width: 100%;
      background: #0d131a;
      border-top: 1px solid #1e2838;
      padding: 10px 16px;
      font-size: 0.76rem;
      color: #7b8a9e;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      z-index: 1000;
      position: relative;
    `;

    const leftCol = document.createElement("div");
    leftCol.innerHTML = `Werewolf Engine &bull; Version: <strong style="color:#0088ff;">${ENGINE_VERSION}</strong>`;

    const rightCol = document.createElement("div");
    rightCol.id = "nyLiveClockDisplay";
    rightCol.style.color = "#ffe099";

    footer.appendChild(leftCol);
    footer.appendChild(rightCol);
    document.body.appendChild(footer);

    function updateNYClock() {
      const clockEl = document.getElementById("nyLiveClockDisplay");
      if (!clockEl) return;
      try {
        const formatter = new Intl.DateTimeFormat("en-US", {
          timeZone: "America/New_York",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false
        });
        clockEl.textContent = `NY Time: ${formatter.format(new Date())} EDT`;
      } catch (e) {
        clockEl.textContent = `Build: 2026-10-10 01:53 EDT`;
      }
    }
    updateNYClock();
    setInterval(updateNYClock, 1000);
  }

  /* ==========================================================
     SECTION 7: FIREBASE DYNAMIC BRANDING & WRITE-PROTECTED SYNC
     ========================================================== */
  // Line 433: Safe write-protection gate for localStorage syncing
  function safeSyncLocalStorage(key, incomingData) {
    if (incomingData === null || incomingData === undefined || incomingData === "") {
      console.warn(`[Write-Protection Gate] Sync rejected for key "${key}": incoming payload is null or empty.`);
      return false;
    }
    try {
      const serialized = typeof incomingData === "object" ? JSON.stringify(incomingData) : String(incomingData);
      localStorage.setItem(key, serialized);
      return true;
    } catch (e) {
      console.warn(`[Write-Protection Gate] Storage write error for key "${key}":`, e);
      return false;
    }
  }

  // Line 449: Dynamic branding binder using relative protocols
  function applyDynamicBrandLogo(imageUrl) {
    if (!imageUrl || typeof imageUrl !== "string") return;
    const cleanUrl = imageUrl.trim();

    const favicon = document.getElementById("dynamicFavicon") || document.querySelector('link[rel="icon"]');
    const appleIcon = document.getElementById("dynamicAppleIcon") || document.querySelector('link[rel="apple-touch-icon"]');
    const brandLogo = document.getElementById("navBrandLogo");

    if (favicon) favicon.href = cleanUrl;
    if (appleIcon) appleIcon.href = cleanUrl;
    if (brandLogo) brandLogo.src = cleanUrl;

    // Refresh dynamic manifest with the updated brand artwork
    injectDynamicManifest(cleanUrl);
  }

  // Line 466: Initialize Firebase RTDB branding listener with fallback
  function initDynamicFirebaseBranding() {
    const cachedBrand = localStorage.getItem("werewolf_brand_logo");
    if (cachedBrand) {
      applyDynamicBrandLogo(cachedBrand);
    } else {
      applyDynamicBrandLogo(DEFAULT_REPO_ICON);
    }

    if (typeof firebase !== "undefined" && firebase.database) {
      try {
        const rtdb = firebase.database();
        rtdb.ref(FIREBASE_BRAND_PATH).on("value", snapshot => {
          const brandImg = snapshot.val();
          if (brandImg && typeof brandImg === "string" && brandImg.trim() !== "") {
            safeSyncLocalStorage("werewolf_brand_logo", brandImg);
            applyDynamicBrandLogo(brandImg);
          } else {
            console.warn("[Firebase Branding] Remote node is null or empty. Retaining cached asset.");
          }
        }, err => {
          console.warn("[Firebase Branding] Connection error, retaining fallback:", err);
        });
      } catch (e) {
        console.warn("[Firebase Branding] Database initialization warning:", e);
      }
    }
  }

  /* ==========================================================
     SECTION 8: DOM READY BINDINGS & GLOBAL API EXPOSURE
     ========================================================== */
  // Line 498: Bind UI elements when DOM is fully loaded
  document.addEventListener("DOMContentLoaded", () => {
    sanitizeImageAltAttributes();
    enforceLinkStandards();
    injectPersistentNYFooter();
    initDynamicFirebaseBranding();
    checkStorageDiagnostics();

    const installBtn = document.getElementById("pwaInstallBtn");
    if (installBtn) {
      installBtn.addEventListener("click", async () => {
        if (!deferredInstallPrompt) return;
        deferredInstallPrompt.prompt();
        const { outcome } = await deferredInstallPrompt.userChoice;
        if (outcome === "accepted") {
          installBtn.style.display = "none";
        }
        deferredInstallPrompt = null;
      });
    }
  });

  window.addEventListener("appinstalled", () => {
    const installBtn = document.getElementById("pwaInstallBtn");
    if (installBtn) installBtn.style.display = "none";
    showConnectivityToast("🎉 Application successfully installed!");
  });

  // Line 528: Expose Universal Engine to global scope
  window.UniversalApp = {
    version: ENGINE_VERSION,
    setBadge: updateAppBadge,
    clearBadge: () => updateAppBadge(0),
    requestWakeLock: requestScreenWakeLock,
    releaseWakeLock: releaseScreenWakeLock,
    share: triggerWebShare,
    showToast: showConnectivityToast,
    safeSync: safeSyncLocalStorage,
    checkStorage: checkStorageDiagnostics
  };
})();
