# AppBlocker — custom Capacitor plugin

Detects when the user opens a distracting app (Instagram, YouTube, etc.) during
a Pomodoro and (a) emits a `blockedAppDetected` event to JS and (b) brings
StudyBuddy back to the foreground.

## Why custom?
No published Capacitor wrapper exists for Android's `UsageStatsManager` at the
time of writing. This folder contains the minimal Kotlin source you need.

## Setup (after `npx cap add android`)
1. Copy `AppBlockerPlugin.kt` into `android/app/src/main/java/app/lovable/<id>/`
   and fix the `package` line to match the folder.
2. Follow `MainActivity-registration.txt` to register the plugin and add the
   required AndroidManifest permissions.
3. `npm run build && npx cap sync android && npx cap open android`
4. Build & install on a real device (USAGE_STATS does not work on most emulators).
5. In the app, open Focus Mode → Strict + Focus Block → tap *Grant permission*.

## Limits (honest)
- Android does **not** let third-party apps force-close other apps. We can
  only *detect* the foreground app and re-launch ourselves on top — the user
  can still swipe away or ignore.
- `PACKAGE_USAGE_STATS` is a sensitive permission. Google Play requires a
  declaration form explaining why you use it. Be ready to justify it.
- Polling every ~1.5s drains battery slightly; we stop the moment the timer
  ends or the user disables Focus Block.

## JS side
Already wired in `src/capacitor-plugins/app-blocker/index.ts` and consumed by
`src/lib/focus-block.ts` + `src/pages/FocusMode.tsx`. On web and iOS the
plugin no-ops and the app falls back to `visibilitychange` detection.
