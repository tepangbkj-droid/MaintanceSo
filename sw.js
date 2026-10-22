// Service Worker Tarobun (sederhana & aman).
// SENGAJA tanpa cache offline: supaya tidak pernah menyajikan app.js lama yang basi.
// Fungsinya hanya: (1) menjadi worker aktif agar registration.showNotification() di app.js bisa jalan,
// (2) menampilkan notifikasi push (FCM), (3) membuka/fokus aplikasi saat notifikasi diketuk.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = { notification: { body: event.data ? event.data.text() : '' } }; }
  const n = d.notification || {};
  const data = d.data || {};
  const title = n.title || data.title || 'Tarobun';
  const options = {
    body: n.body || data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: data,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of list) { if ('focus' in c) return c.focus(); }
    if (self.clients.openWindow) return self.clients.openWindow('/');
  })());
});
