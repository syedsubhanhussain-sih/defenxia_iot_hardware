package com.defenxia.security.guard

import android.accessibilityservice.AccessibilityService
import android.app.ActivityOptions
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import android.view.accessibility.AccessibilityEvent

class DefenxiaAccessibilityService : AccessibilityService() {

    companion object {
        private const val TAG = "DefenxiaAccessService"
        @Volatile
        var isServiceRunning = false
            private set
    }

    private var currentForegroundPackage: String? = null
    private val launcherPackages = mutableSetOf<String>()
    private var screenOffReceiver: BroadcastReceiver? = null

    override fun onServiceConnected() {
        super.onServiceConnected()
        isServiceRunning = true
        refreshLauncherPackages()
        registerScreenOffReceiver()
        Log.i(TAG, "Defenxia Accessibility Service connected and active")
    }

    private fun registerScreenOffReceiver() {
        try {
            if (screenOffReceiver == null) {
                screenOffReceiver = object : BroadcastReceiver() {
                    override fun onReceive(context: Context?, intent: Intent?) {
                        if (intent?.action == Intent.ACTION_SCREEN_OFF) {
                            Log.d(TAG, "Screen turned OFF -> locking all protected apps")
                            SecureCardStorage.lockAllPackages()
                            currentForegroundPackage = null
                        }
                    }
                }
                val filter = IntentFilter(Intent.ACTION_SCREEN_OFF)
                registerReceiver(screenOffReceiver, filter)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error registering screen off receiver: ${e.message}")
        }
    }

    private fun refreshLauncherPackages() {
        try {
            launcherPackages.clear()
            // Standard launcher packages fallback across common OEMs
            launcherPackages.addAll(listOf(
                "com.android.launcher",
                "com.google.android.apps.nexuslauncher",
                "com.sec.android.app.launcher",
                "com.oneplus.launcher",
                "com.oppo.launcher",
                "com.coloros.launcher",
                "com.heytap.launcher",
                "com.bbk.launcher2",
                "com.vivo.launcher",
                "com.miui.home",
                "com.huawei.android.launcher",
                "com.teslacoilsw.launcher"
            ))

            // Query actual resolved launcher(s) from current Android system
            val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
            val resolveInfos = packageManager.queryIntentActivities(intent, PackageManager.MATCH_DEFAULT_ONLY)
            for (info in resolveInfos) {
                info.activityInfo?.packageName?.let { launcherPackages.add(it) }
            }
            Log.d(TAG, "Recognized ${launcherPackages.size} launcher package(s)")
        } catch (e: Exception) {
            Log.w(TAG, "Error resolving launcher packages: ${e.message}")
        }
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        val eventType = event.eventType
        if (eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED || 
            eventType == AccessibilityEvent.TYPE_WINDOWS_CHANGED) {
            
            val packageName = event.packageName?.toString() ?: return

            // 1. Ignore Defenxia itself (prevents recursive lock on lock screen)
            if (packageName == applicationContext.packageName) {
                return
            }

            // 2. Ignore transient system overlays: keyboard, permission dialog, autofill
            if (isTransientSystemUi(packageName)) {
                return
            }

            val prevPackage = currentForegroundPackage
            currentForegroundPackage = packageName

            // 3. If transitioning AWAY from an active protected app -> mark it backgrounded/locked
            if (prevPackage != null && prevPackage != packageName && SecureCardStorage.isPackageProtected(applicationContext, prevPackage)) {
                Log.d(TAG, "Protected app left: $prevPackage -> new foreground: $packageName")
                SecureCardStorage.onPackageBackgrounded(prevPackage)
            }

            // 4. If current package is Home / Launcher -> ensure any previous app is backgrounded
            if (isLauncherPackage(packageName)) {
                SecureCardStorage.lastForegroundProtectedPackage?.let { lastPkg ->
                    SecureCardStorage.onPackageBackgrounded(lastPkg)
                }
                return
            }

            // 5. If current package is a protected app -> inspect lock state
            if (SecureCardStorage.isPackageProtected(applicationContext, packageName)) {
                if (SecureCardStorage.isPackageUnlocked(packageName)) {
                    // Currently in an authorized session
                    SecureCardStorage.onPackageForegrounded(packageName)
                } else {
                    // Needs NFC authentication! Launch lock screen
                    Log.i(TAG, "Protected app launch intercepted: $packageName -> Launching NFC Lock")
                    launchLockScreen(packageName)
                }
            }
        }
    }

    private fun isTransientSystemUi(packageName: String): Boolean {
        return packageName.contains("inputmethod") ||
               packageName.contains("keyboard") ||
               packageName.contains("permissioncontroller") ||
               packageName == "android" // system dialogs like USB, biometric prompts
    }

    private fun isLauncherPackage(packageName: String): Boolean {
        return packageName == "com.android.systemui" ||
               packageName.contains("launcher") ||
               launcherPackages.contains(packageName)
    }

    private fun launchLockScreen(packageName: String) {
        try {
            val lockIntent = Intent(this, NfcLockActivity::class.java).apply {
                putExtra(NfcLockActivity.EXTRA_PACKAGE_NAME, packageName)
                addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP or
                    Intent.FLAG_ACTIVITY_NO_USER_ACTION
                )
            }

            // Support Android 14/15 background activity start restrictions across OxygenOS / Funtouch OS
            if (Build.VERSION.SDK_INT >= 34) { // Android 14 (UPSIDE_DOWN_CAKE) and Android 15
                try {
                    val options = ActivityOptions.makeCustomAnimation(this, 0, 0)
                    options.setPendingIntentBackgroundActivityStartMode(
                        ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOWED
                    )
                    startActivity(lockIntent, options.toBundle())
                    return
                } catch (e: Throwable) {
                    Log.w(TAG, "ActivityOptions background start fallback: ${e.message}")
                }
            }

            // Direct start for standard compatibility
            startActivity(lockIntent)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to launch lock screen: ${e.message}", e)
            // Fallback: PendingIntent trigger
            try {
                val pendingIntent = PendingIntent.getActivity(
                    this,
                    0,
                    Intent(this, NfcLockActivity::class.java).apply {
                        putExtra(NfcLockActivity.EXTRA_PACKAGE_NAME, packageName)
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                    },
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
                )
                pendingIntent.send()
            } catch (fallbackError: Exception) {
                Log.e(TAG, "PendingIntent fallback also failed: ${fallbackError.message}")
            }
        }
    }

    override fun onInterrupt() {
        Log.w(TAG, "Defenxia Accessibility Service interrupted")
    }

    override fun onDestroy() {
        super.onDestroy()
        isServiceRunning = false
        try {
            screenOffReceiver?.let {
                unregisterReceiver(it)
                screenOffReceiver = null
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error unregistering receiver: ${e.message}")
        }
        Log.d(TAG, "Defenxia Accessibility Service destroyed")
    }
}
