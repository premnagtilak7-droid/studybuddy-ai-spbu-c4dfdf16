// Custom Service Worker for background timer checks and study reminders
const TIMER_CHECK_INTERVAL = 30000;

self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  if (type === 'TIMER_COMPLETE') {
    self.registration.showNotification(data.title || '⏰ Timer Complete!', {
      body: data.body || 'Your study timer has finished.',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: 'timer-complete',
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200, 100, 200],
    });
  }
  
  if (type === 'STUDY_REMINDER') {
    self.registration.showNotification(`📚 Time to study ${data.subjectName}!`, {
      body: data.motivation || `Your scheduled study reminder for ${data.subjectName} is now.`,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: `reminder-${data.id}`,
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200, 100, 200],
      actions: [
        { action: 'snooze', title: '⏰ Snooze 10min' },
        { action: 'open', title: '📖 Open App' },
      ],
      data: { reminderId: data.id, subjectName: data.subjectName },
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

  if (type === 'EXAM_COUNTDOWN') {
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: `exam-${data.examDate}`,
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200],
    });
  }
});

// Handle notification clicks and actions
self.addEventListener('notificationclick', (event) => {
  const action = event.action;
  const data = event.notification.data || {};
  
  event.notification.close();

  if (action === 'snooze') {
    // Re-show notification after 10 minutes
    setTimeout(() => {
      self.registration.showNotification(`📚 Snoozed: Time to study ${data.subjectName || ''}!`, {
        body: 'Your snoozed reminder is back. Time to start studying! 💪',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: `reminder-snooze-${data.reminderId || 'general'}`,
        requireInteraction: true,
        vibrate: [200, 100, 200, 100, 200, 100, 200],
      });
    }, 10 * 60 * 1000);
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        clientList[0].focus();
      } else {
        clients.openWindow('/');
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
        requireInteraction: true,
        vibrate: [200, 100, 200],
      })
    );
  } catch {}
});
