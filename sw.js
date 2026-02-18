// Service Worker — локальные уведомления без push-сервера
const CACHE = 'napomni-v1';
const scheduled = new Map(); // id → timerId

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(['./index.html', './icon.svg', './manifest.json']))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

// Получаем задачи от главного треда
self.addEventListener('message', e => {
  const { type, id, title, body, reminderTime } = e.data;

  if (type === 'schedule') {
    // Отменяем старый таймер если был
    if (scheduled.has(id)) clearTimeout(scheduled.get(id));

    const delay = reminderTime - Date.now();
    if (delay <= 0) return;

    const timer = setTimeout(() => {
      self.registration.showNotification(title, {
        body,
        icon: './icon.svg',
        badge: './icon.svg',
        vibrate: [200, 100, 200, 100, 200],
        tag: String(id),
        requireInteraction: false,
        silent: false,
      });
      scheduled.delete(id);
    }, Math.min(delay, 2147483647)); // setTimeout max ~24.8 дней

    scheduled.set(id, timer);
  }

  if (type === 'cancel') {
    if (scheduled.has(id)) {
      clearTimeout(scheduled.get(id));
      scheduled.delete(id);
    }
  }
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(cs => {
      if (cs.length) return cs[0].focus();
      return clients.openWindow('./');
    })
  );
});
