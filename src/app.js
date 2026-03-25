/**
 * Main application entry point (PWA)
 * In production, uses CDN imports for PGlite.
 * import { PGlite } from 'https://cdn.jsdelivr.net/npm/@electric-sql/pglite/dist/index.js'
 */

// Service Worker registration for PWA
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {
    // Service worker registration failed - app still works
  });
}

console.log('secman – BSI IT-Grundschutz Management App geladen');
