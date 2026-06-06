// Nav Active State Sync (ITC)
document.addEventListener('DOMContentLoaded', () => {
  const currentPath = window.location.pathname.split("/").pop();
  const navLinks = document.querySelectorAll('.nav-link');

  navLinks.forEach(link => {
    // Add target for better UX
    link.setAttribute('target', 'main-content-window');
    
    if (link.getAttribute('href').includes(currentPath)) {
      link.style.fontWeight = 'bold';
    }
  });

  // Example of Cross-Tab State sync for theme or nav preferences
  window.addEventListener('storage', (event) => {
    if (event.key === 'nav-preference') {
      console.log('Nav state synced across tabs:', event.newValue);
    }
  });
});
