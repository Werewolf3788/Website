// Section 1: Universal Dynamic PWA Manifest Generator
// Automatically adapts manifest metadata to any GitHub Pages sub-path
(function initUniversalPWA() {
  const currentPath = window.location.pathname;
  const pageTitle = document.title || "Werewolf Portal";
  
  // Resolve universal icons from GitHub repo
  const defaultIcon = "//raw.githubusercontent.com/Werewolf3788/Website/refs/heads/main/Images/werewolf_movie_anywhere.jpg";

  // Build the dynamic manifest object
  const dynamicManifest = {
    name: pageTitle,
    short_name: pageTitle.length > 12 ? pageTitle.substring(0, 12) : pageTitle,
    description: `Universal Hub Engine - ${pageTitle}`,
    start_url: currentPath,
    scope: "./",
    display: "standalone",
    orientation: "any",
    background_color: "#0b0f19",
    theme_color: "#151c27",
    icons: [
      {
        src: defaultIcon,
        sizes: "192x192",
        type: "image/jpeg",
        purpose: "any"
      },
      {
        src: defaultIcon,
        sizes: "512x512",
        type: "image/jpeg",
        purpose: "maskable"
      }
    ]
  };

  // Convert object to a blob URL and attach to <head>
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

  // Register the universal root-level service worker
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      // Points to sw.js located at your repo root or relative path
      navigator.serviceWorker.register("./sw.js")
        .then(reg => console.log("Universal PWA Worker Active:", reg.scope))
        .catch(err => console.warn("PWA Worker Registration:", err));
    });
  }
})();
