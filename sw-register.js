// Dipindah dari <script> inline index.html (CSP tanpa unsafe-inline).
// 2026-10-22: updateViaCache 'none' + update() tiap buka, supaya Service Worker terbaru selalu diambil.
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      try {
        navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
          .then(reg => { try { reg.update(); } catch (e) {} })
          .catch(err => console.log('SW gagal:', err));
      } catch (err) {
        console.log('SW gagal (sinkron):', err);
      }
    });
  }
