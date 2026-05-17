// High-level wrapper around the AppBlocker native plugin.
// User-customizable: blocked apps come from the `user_blocked_apps` table.
import AppBlocker, { isNativeAndroid, type BlockedAppEvent } from "@/capacitor-plugins/app-blocker";
import { supabase } from "@/integrations/supabase/client";

/** Curated catalog seeded for new users. */
export const DEFAULT_BLOCKED_APPS: { label: string; pkg: string }[] = [
  { label: "Instagram",  pkg: "com.instagram.android" },
  { label: "YouTube",    pkg: "com.google.android.youtube" },
  { label: "TikTok",     pkg: "com.zhiliaoapp.musically" },
  { label: "Snapchat",   pkg: "com.snapchat.android" },
  { label: "Facebook",   pkg: "com.facebook.katana" },
  { label: "WhatsApp",   pkg: "com.whatsapp" },
  { label: "Twitter / X", pkg: "com.twitter.android" },
  { label: "Netflix",    pkg: "com.netflix.mediaclient" },
  { label: "Free Fire",  pkg: "com.dts.freefireth" },
  { label: "PUBG Mobile", pkg: "com.tencent.ig" },
  { label: "Call of Duty Mobile", pkg: "com.activision.callofduty.shooter" },
  { label: "Reddit",     pkg: "com.reddit.frontpage" },
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
  try { return (await AppBlocker.hasUsageStatsPermission()).granted; } catch { return false; }
}

export async function openUsageAccessSettings(): Promise<void> {
  if (!isNativeAndroid()) return;
  try { await AppBlocker.openUsageAccessSettings(); } catch {}
}

/** Reads enabled blocked apps for the current user. Returns empty list if no auth. */
export async function getEnabledBlockedApps(): Promise<{ label: string; pkg: string }[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("user_blocked_apps")
    .select("label, package_name, enabled")
    .eq("user_id", user.id)
    .eq("enabled", true);
  return (data ?? []).map((r: any) => ({ label: r.label, pkg: r.package_name }));
}

export async function startBlocking(onBlocked: (e: BlockedAppEvent) => void) {
  if (!isNativeAndroid()) return { stop: async () => {} };
  const apps = await getEnabledBlockedApps();
  const list = apps.length ? apps : DEFAULT_BLOCKED_APPS;
  const listener = await AppBlocker.addListener("blockedAppDetected", onBlocked);
  await AppBlocker.startMonitoring({
    blockedPackages: list.map(b => b.pkg),
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

/** Legacy alias kept for FocusMode.tsx import compatibility. */
export const BLOCKED_APPS = DEFAULT_BLOCKED_APPS.map(a => ({ pkg: a.pkg, label: a.label }));
