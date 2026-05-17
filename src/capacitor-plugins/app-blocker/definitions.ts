// JS-side definitions for the custom "AppBlocker" Capacitor plugin.
// Implementation lives in android/.../AppBlockerPlugin.kt (copy from this folder).
export interface BlockedAppEvent {
  packageName: string;
  appLabel: string;
  timestamp: number;
}

export interface AppBlockerPlugin {
  /** Returns true if PACKAGE_USAGE_STATS has been granted by the user. */
  hasUsageStatsPermission(): Promise<{ granted: boolean }>;

  /** Opens Android Settings -> "Usage access". User must toggle StudyBuddy ON. */
  openUsageAccessSettings(): Promise<void>;

  /** Begins polling foreground app every `intervalMs`. Fires `blockedAppDetected` events. */
  startMonitoring(opts: {
    blockedPackages: string[];
    intervalMs?: number; // default 1500
  }): Promise<void>;

  /** Stops polling. */
  stopMonitoring(): Promise<void>;

  /** Brings StudyBuddy back to the foreground (best-effort). */
  bringToForeground(): Promise<void>;

  addListener(
    eventName: 'blockedAppDetected',
    cb: (e: BlockedAppEvent) => void,
  ): Promise<{ remove: () => Promise<void> }>;
}
