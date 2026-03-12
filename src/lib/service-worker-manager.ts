// Manages the custom service worker registration and communication

let swRegistration: ServiceWorkerRegistration | null = null;

export async function registerCustomSW(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  
  try {
    // Register our custom SW alongside the PWA one
    swRegistration = await navigator.serviceWorker.register('/sw-custom.js', { scope: '/' });
    return swRegistration;
  } catch (err) {
    console.warn('Custom SW registration failed:', err);
    return null;
  }
}

export async function getSwRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (swRegistration) return swRegistration;
  if (!('serviceWorker' in navigator)) return null;
  
  try {
    const reg = await navigator.serviceWorker.ready;
    swRegistration = reg;
    return reg;
  } catch {
    return null;
  }
}

export async function sendToSW(message: { type: string; data: any }) {
  const reg = await getSwRegistration();
  if (reg?.active) {
    reg.active.postMessage(message);
  }
}

export async function requestNotificationPermissionWithPrompt(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  
  const stored = localStorage.getItem('notif_permission_asked');
  if (stored && Notification.permission !== 'default') {
    return Notification.permission;
  }
  
  const result = await Notification.requestPermission();
  localStorage.setItem('notif_permission_asked', '1');
  return result;
}

export function hasNotificationPermission(): boolean {
  return 'Notification' in window && Notification.permission === 'granted';
}
