// Dipindah dari <script> inline index.html (CSP tanpa unsafe-inline).
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      try {
        // BUGFIX (2026-07-18): sama seperti Notification.requestPermission(), di
        // sebagian WebView pendaftaran Service Worker juga bisa gagal SECARA SINKRON
        // (bukan cuma promise reject), jadi .catch() saja tidak cukup — dibungkus
        // try/catch juga. Kalau gagal, cukup diam saja; app tetap jalan normal tanpa
        // fitur offline/notifikasi push, tidak menghalangi apa pun yang lain.
        navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW gagal:', err));
      } catch (err) {
        console.log('SW gagal (sinkron):', err);
      }
    });
  }
