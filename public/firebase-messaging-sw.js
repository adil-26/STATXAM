// Firebase Messaging Service Worker for StatXam Web & PWA
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (event.data) {
    let payload = {};
    try {
      payload = event.data.json();
    } catch {
      payload = { notification: { title: 'StatXam Alert', body: event.data.text() } };
    }

    const title = payload.notification?.title || payload.data?.title || 'StatXam Message';
    const body = payload.notification?.body || payload.data?.body || 'You have a new academic update.';
    const url = payload.data?.url || (payload.data?.conversationId ? `/messages?c=${payload.data.conversationId}` : '/messages');

    const options = {
      body,
      icon: '/icon.png',
      badge: '/icon.png',
      vibrate: [100, 50, 100],
      data: {
        url,
        dateOfArrival: Date.now(),
      },
      actions: [
        { action: 'open', title: 'Open Message' }
      ]
    };

    event.waitUntil(self.registration.showNotification(title, options));
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/messages';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
