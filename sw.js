// Service Worker Tarobun v2 (2026-10-22) — membersihkan cache lama & memuat ulang halaman sekali.
// Tanpa cache offline: tidak pernah menyajikan app.js lama. Tetap mendukung notifikasi push.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try { const keys = await caches.keys(); await Promise.all(keys.map((k) => caches.delete(k))); } catch (e) {}
    await self.clients.claim();
    try {
      const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const c of list) { try { await c.navigate(c.url); } catch (e) {} }
    } catch (e) {}
  })());
});

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = { notification: { body: event.data ? event.data.text() : '' } }; }
  const n = d.notification || {};
  const data = d.data || {};
  event.waitUntil(self.registration.showNotification(n.title || data.title || 'Tarobun', {
    body: n.body || data.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: data,
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of list) { if ('focus' in c) return c.focus(); }
    if (self.clients.openWindow) return self.clients.openWindow('/');
  })());
});
