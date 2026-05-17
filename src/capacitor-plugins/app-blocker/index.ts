import { registerPlugin, Capacitor } from '@capacitor/core';
import type { AppBlockerPlugin } from './definitions';

// On the web, this returns a stub that always reports "not granted" so the
// app gracefully falls back to tab-leave detection. On Android, the bridge
// resolves to the Kotlin AppBlockerPlugin registered in MainActivity.
const AppBlocker = registerPlugin<AppBlockerPlugin>('AppBlocker', {
  web: () => ({
    hasUsageStatsPermission: async () => ({ granted: false }),
    openUsageAccessSettings: async () => {},
    startMonitoring: async () => {},
    stopMonitoring: async () => {},
    bringToForeground: async () => {},
    addListener: async () => ({ remove: async () => {} }),
  }),
});

export const isNativeAndroid = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

export const isNativeIOS = () =>
  Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios';

export default AppBlocker;
export type { AppBlockerPlugin, BlockedAppEvent } from './definitions';
