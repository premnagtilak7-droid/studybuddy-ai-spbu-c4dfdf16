// High-level wrapper around the AppBlocker native plugin.
// Used by FocusMode.tsx. On non-Android platforms everything no-ops gracefully.
import AppBlocker, { isNativeAndroid, type BlockedAppEvent } from "@/capacitor-plugins/app-blocker";

export const BLOCKED_APPS: { pkg: string; label: string }[] = [
  { pkg: "com.instagram.android", label: "Instagram" },
  { pkg: "com.google.android.youtube", label: "YouTube" },
  { pkg: "com.facebook.katana", label: "Facebook" },
  { pkg: "com.snapchat.android", label: "Snapchat" },
  { pkg: "com.twitter.android", label: "Twitter / X" },
  { pkg: "com.x.android", label: "X" },
  { pkg: "com.zhiliaoapp.musically", label: "TikTok" },
  { pkg: "com.ss.android.ugc.trill", label: "TikTok" },
  { pkg: "com.whatsapp", label: "WhatsApp" },
];

export type FocusBlockSupport = "native-android" | "web-fallback" | "ios-fallback";

export function detectSupport(): FocusBlockSupport {
  if (isNativeAndroid()) return "native-android";
  if (typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent)) {
    return "ios-fallback";
  }
  return "web-fallback";
}

export async function hasUsageAccess(): Promise<boolean> {
  if (!isNativeAndroid()) return false;
  try {
    const { granted } = await AppBlocker.hasUsageStatsPermission();
    return granted;
  } catch {
    return false;
  }
}

export async function openUsageAccessSettings(): Promise<void> {
  if (!isNativeAndroid()) return;
  try { await AppBlocker.openUsageAccessSettings(); } catch {}
}

export async function startBlocking(onBlocked: (e: BlockedAppEvent) => void) {
  if (!isNativeAndroid()) return { stop: async () => {} };
  const listener = await AppBlocker.addListener("blockedAppDetected", onBlocked);
  await AppBlocker.startMonitoring({
    blockedPackages: BLOCKED_APPS.map(b => b.pkg),
    intervalMs: 1500,
  });
  return {
    stop: async () => {
      try { await AppBlocker.stopMonitoring(); } catch {}
      try { await listener.remove(); } catch {}
    },
  };
}

export type BlockedAttempt = { app: string; pkg: string; at: number };
