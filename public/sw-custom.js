// Custom Service Worker for background timer checks and study reminders
// This runs independently of the main app

const TIMER_CHECK_INTERVAL = 30000; // 30 seconds

// Listen for messages from the app
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  if (type === 'TIMER_COMPLETE') {
    self.registration.showNotification(data.title || '⏰ Timer Complete!', {
      body: data.body || 'Your study timer has finished.',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: 'timer-complete',
      requireInteraction: true,
      vibrate: [200, 100, 200],
    });
  }
  
  if (type === 'STUDY_REMINDER') {
    self.registration.showNotification(`📚 Time to study ${data.subjectName}!`, {
      body: `Your scheduled study reminder for ${data.subjectName} is now.`,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: `reminder-${data.id}`,
      requireInteraction: true,
      vibrate: [200, 100, 200],
    });
  }

  if (type === 'GROUP_NOTIFICATION') {
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: `group-${data.groupId}`,
    });
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        clientList[0].focus();
      } else {
        clients.openWindow('/study-timer');
      }
    })
  );
});

// Push event for server-sent push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;
  try {
    const data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || 'SPPU Study', {
        body: data.body || '',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: data.tag || 'general',
      })
    );
  } catch {}
});
