// File: android/app/src/main/java/app/lovable/<your-id>/AppBlockerPlugin.kt
//
// COPY THIS FILE INTO YOUR ANDROID PROJECT AFTER RUNNING `npx cap add android`.
// Then register it inside MainActivity.java (see MainActivity-registration.txt).
//
// Required AndroidManifest.xml additions inside <manifest>:
//   <uses-permission android:name="android.permission.PACKAGE_USAGE_STATS"
//                    tools:ignore="ProtectedPermissions" />
//   <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
//   <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
//   <uses-permission android:name="android.permission.REORDER_TASKS" />
//
// And add `xmlns:tools="http://schemas.android.com/tools"` to the <manifest> tag.

package app.lovable

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.os.Process
import android.provider.Settings
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "AppBlocker")
class AppBlockerPlugin : Plugin() {

    private val handler = Handler(Looper.getMainLooper())
    private var pollingRunnable: Runnable? = null
    private var blockedPackages: Set<String> = emptySet()
    private var intervalMs: Long = 1500L
    private var lastFiredFor: MutableMap<String, Long> = mutableMapOf()
    private val cooldownMs = 4000L

    @PluginMethod
    fun hasUsageStatsPermission(call: PluginCall) {
        val ctx = context
        val appOps = ctx.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode = appOps.checkOpNoThrow(
            AppOpsManager.OPSTR_GET_USAGE_STATS,
            Process.myUid(),
            ctx.packageName
        )
        val ret = JSObject()
        ret.put("granted", mode == AppOpsManager.MODE_ALLOWED)
        call.resolve(ret)
    }

    @PluginMethod
    fun openUsageAccessSettings(call: PluginCall) {
        val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS)
        intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK
        context.startActivity(intent)
        call.resolve()
    }

    @PluginMethod
    fun startMonitoring(call: PluginCall) {
        val arr = call.getArray("blockedPackages")
        val list = mutableSetOf<String>()
        if (arr != null) for (i in 0 until arr.length()) list.add(arr.getString(i))
        blockedPackages = list
        intervalMs = (call.getInt("intervalMs") ?: 1500).toLong()

        stopPolling()
        pollingRunnable = object : Runnable {
            override fun run() {
                try {
                    val pkg = currentForegroundPackage()
                    if (pkg != null && blockedPackages.contains(pkg)) {
                        val now = System.currentTimeMillis()
                        val last = lastFiredFor[pkg] ?: 0L
                        if (now - last > cooldownMs) {
                            lastFiredFor[pkg] = now
                            val ev = JSObject()
                            ev.put("packageName", pkg)
                            ev.put("appLabel", labelFor(pkg))
                            ev.put("timestamp", now)
                            notifyListeners("blockedAppDetected", ev)
                            bringSelfToForeground()
                        }
                    }
                } catch (_: Throwable) {}
                handler.postDelayed(this, intervalMs)
            }
        }
        handler.post(pollingRunnable!!)
        call.resolve()
    }

    @PluginMethod
    fun stopMonitoring(call: PluginCall) {
        stopPolling()
        call.resolve()
    }

    @PluginMethod
    fun bringToForeground(call: PluginCall) {
        bringSelfToForeground()
        call.resolve()
    }

    // --- helpers ---

    private fun stopPolling() {
        pollingRunnable?.let { handler.removeCallbacks(it) }
        pollingRunnable = null
        lastFiredFor.clear()
    }

    private fun currentForegroundPackage(): String? {
        val usm = context.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val end = System.currentTimeMillis()
        val begin = end - 10_000
        val events = usm.queryEvents(begin, end)
        val ev = UsageEvents.Event()
        var lastPkg: String? = null
        while (events.hasNextEvent()) {
            events.getNextEvent(ev)
            if (ev.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND ||
                ev.eventType == UsageEvents.Event.ACTIVITY_RESUMED) {
                lastPkg = ev.packageName
            }
        }
        return lastPkg
    }

    private fun labelFor(pkg: String): String = when (pkg) {
        "com.instagram.android" -> "Instagram"
        "com.google.android.youtube" -> "YouTube"
        "com.facebook.katana" -> "Facebook"
        "com.snapchat.android" -> "Snapchat"
        "com.twitter.android", "com.x.android" -> "X / Twitter"
        "com.zhiliaoapp.musically", "com.ss.android.ugc.trill" -> "TikTok"
        "com.whatsapp" -> "WhatsApp"
        else -> pkg
    }

    private fun bringSelfToForeground() {
        try {
            val launch = context.packageManager.getLaunchIntentForPackage(context.packageName)
            launch?.addFlags(
                Intent.FLAG_ACTIVITY_NEW_TASK or
                Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or
                Intent.FLAG_ACTIVITY_SINGLE_TOP
            )
            launch?.let { context.startActivity(it) }
        } catch (_: Throwable) {}
    }
}
