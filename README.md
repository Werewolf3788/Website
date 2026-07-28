<!-- 
  ============================================================
  === SECTION: Project Metadata & Header ===
  Version: 1.0.0
  Timestamp: 2026-07-28
  Description: Repository README for Werewolf3788/Website
  ============================================================
-->

# Werewolf3788 Personal Web Portal & Digital Hub

Welcome to the official repository for my personal web portal, interactive trackers, and digital project hub. This project serves as a centralized platform integrating custom web apps, dynamic UI layouts, community resources, and live tracking utilities.

---

## 🚀 Key Features & Architecture

* **Universal Design System:** Built with cross-browser compatibility (Chrome, Safari, Firefox, Edge) and a mobile-first responsive grid utilizing flexible layout variables and dynamic contrast styling.
* **Interactive UI Components:**
  * **Universal Lightbox:** Native full-screen image viewing triggers across all media elements.
  * **Expandable Content Cards:** Clean `flex-grow` layouts with "Read More" triggers opening structured info cards and interactive satellite map pins for regional locations.
  * **Smart Tabs & Interception:** Prevents duplicate window spawning by routing internal and external links through controlled window/BroadcastChannel states.
* **Real-Time Data & Syncing (Firebase v9+):**
  * Public checklists and progress trackers powered by modular Firebase references (`/games/{gameId}` and `/users/{userId}/progress/{gameId}`).
  * Built-in resilience with automated reconnection loops and `visibilitychange` state recovery.
* **Analytics & SEO Integration:**
  * GA4 Dual Binding (`G-L376P3NPY4` + project tags).
  * Automated dynamic page titles, meta descriptions, Open Graph (OG) tags, and element tracking via `data-ga-label`.
* **Affiliate Routing Matrix:** Integrated dynamic outbound routing supporting regional directories, gaming trackers, and curated collections.

---

## 📂 Project Structure

```text
├── css/                  # Modular stylesheets with explicit section headers
├── js/                   # Core application logic, Firebase integration, and UI handlers
├── assets/               # Images, media files, and layout resources
└── index.html            # Primary entry point with active version & timestamp footer
