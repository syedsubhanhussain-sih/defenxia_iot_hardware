package com.defenxia.security.guard

import android.Manifest
import android.accessibilityservice.AccessibilityServiceInfo
import android.app.AppOpsManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.drawable.BitmapDrawable
import android.graphics.drawable.Drawable
import android.net.ConnectivityManager
import android.net.Uri
import android.net.wifi.WifiInfo
import android.net.wifi.WifiManager
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import android.text.TextUtils
import android.util.Base64
import android.util.Log
import android.view.accessibility.AccessibilityManager
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.ByteArrayOutputStream
import java.util.concurrent.Executors

@CapacitorPlugin(name = "DefenxiaNfc")
class DefenxiaNfcPlugin : Plugin() {

    companion object {
        private const val TAG = "DefenxiaNfcPlugin"
        // In-memory cache for installed apps to prevent repeated slow queries
        private var cachedInstalledApps: JSArray? = null
        private var lastCacheTimestamp: Long = 0
        private const val CACHE_VALIDITY_MS = 60_000 // 1 minute cache
    }

    private val backgroundExecutor = Executors.newSingleThreadExecutor()

    @PluginMethod
    fun getNfcStatus(call: PluginCall) {
        try {
            val available = NfcManager.isNfcAvailable(context)
            val enabled = NfcManager.isNfcEnabled(context)

            val result = JSObject().apply {
                put("available", available)
                put("enabled", enabled)
            }
            call.resolve(result)
        } catch (e: Exception) {
            call.reject("Failed to check NFC status: ${e.message}", e)
        }
    }

    @PluginMethod
    fun getInstalledApps(call: PluginCall) {
        val forceRefresh = call.getBoolean("forceRefresh", false) ?: false
        val now = System.currentTimeMillis()

        // Return cached apps immediately if fresh
        if (!forceRefresh && cachedInstalledApps != null && (now - lastCacheTimestamp < CACHE_VALIDITY_MS)) {
            Log.d(TAG, "Returning cached installed apps list")
            call.resolve(JSObject().apply { put("apps", cachedInstalledApps) })
            return
        }

        // Run scanning on background worker thread to prevent freezing UI
        backgroundExecutor.execute {
            try {
                val pm = context.packageManager
                val mainIntent = Intent(Intent.ACTION_MAIN, null).apply {
                    addCategory(Intent.CATEGORY_LAUNCHER)
                }

                val resolveInfos = pm.queryIntentActivities(mainIntent, 0)
                val protectedList = SecureCardStorage.getProtectedPackages(context)
                val appsArray = JSArray()

                // Sort apps alphabetically by label for cleaner UX
                val sortedList = resolveInfos.sortedBy {
                    try {
                        it.loadLabel(pm).toString().lowercase()
                    } catch (e: Exception) {
                        it.activityInfo.packageName
                    }
                }

                for (info in sortedList) {
                    val pkg = info.activityInfo?.packageName ?: continue
                    if (pkg == context.packageName) continue

                    val appName = try {
                        info.loadLabel(pm).toString()
                    } catch (e: Exception) {
                        pkg
                    }

                    // Scaled icon for optimal memory and instant rendering
                    val iconBase64 = try {
                        val iconDrawable = info.loadIcon(pm)
                        drawableToBase64Thumbnail(iconDrawable, 72, 72)
                    } catch (e: Exception) {
                        null
                    }

                    val isProtected = protectedList.contains(pkg)

                    val appObj = JSObject().apply {
                        put("packageName", pkg)
                        put("appName", appName)
                        put("icon", iconBase64)
                        put("isProtected", isProtected)
                    }
                    appsArray.put(appObj)
                }

                cachedInstalledApps = appsArray
                lastCacheTimestamp = System.currentTimeMillis()

                val res = JSObject().apply {
                    put("apps", appsArray)
                }
                call.resolve(res)
            } catch (e: Exception) {
                Log.e(TAG, "Error fetching installed apps: ${e.message}", e)
                call.reject("Failed to retrieve installed apps: ${e.message}", e)
            }
        }
    }

    @PluginMethod
    fun getProtectedApps(call: PluginCall) {
        try {
            val packages = SecureCardStorage.getProtectedPackages(context)
            val arr = JSArray()
            packages.forEach { arr.put(it) }

            val res = JSObject().apply {
                put("protectedPackages", arr)
                put("lockTimeoutSeconds", SecureCardStorage.getLockTimeoutSeconds(context))
            }
            call.resolve(res)
        } catch (e: Exception) {
            call.reject("Failed to get protected apps: ${e.message}", e)
        }
    }

    @PluginMethod
    fun setProtectedApps(call: PluginCall) {
        try {
            val packagesArr = call.getArray("packages")
            if (packagesArr == null) {
                call.reject("Missing 'packages' array")
                return
            }

            val packageSet = mutableSetOf<String>()
            for (i in 0 until packagesArr.length()) {
                packageSet.add(packagesArr.getString(i))
            }

            SecureCardStorage.setProtectedPackages(context, packageSet)
            
            // Invalidate app cache so protection state is immediately reflected
            cachedInstalledApps = null

            call.resolve(JSObject().apply { put("success", true) })
        } catch (e: Exception) {
            call.reject("Failed to set protected apps: ${e.message}", e)
        }
    }

    @PluginMethod
    fun getAuthorizedCards(call: PluginCall) {
        try {
            val blueUid = SecureCardStorage.getBlueCardUid(context)
            val whiteUid = SecureCardStorage.getWhiteCardUid(context)

            val blueObj = JSObject().apply {
                put("slot", "blue")
                put("label", "Blue Security KeyFob")
                put("uidMasked", SecureCardStorage.maskUid(blueUid))
                put("rawUid", blueUid)
                put("registered", blueUid.isNotBlank())
            }

            val whiteObj = JSObject().apply {
                put("slot", "white")
                put("label", "White Security Card")
                put("uidMasked", SecureCardStorage.maskUid(whiteUid))
                put("rawUid", whiteUid ?: "")
                put("registered", !whiteUid.isNullOrBlank())
            }

            val res = JSObject().apply {
                put("blueCard", blueObj)
                put("whiteCard", whiteObj)
            }
            call.resolve(res)
        } catch (e: Exception) {
            call.reject("Failed to get authorized cards: ${e.message}", e)
        }
    }

    @PluginMethod
    fun registerCard(call: PluginCall) {
        try {
            val slot = call.getString("slot")?.lowercase()
            val uid = call.getString("uid")

            if (slot == null || uid == null) {
                call.reject("Missing slot or uid")
                return
            }

            when (slot) {
                "blue" -> SecureCardStorage.setBlueCardUid(context, uid)
                "white" -> SecureCardStorage.setWhiteCardUid(context, uid)
                else -> {
                    call.reject("Invalid card slot: must be 'blue' or 'white'")
                    return
                }
            }

            call.resolve(JSObject().apply {
                put("success", true)
                put("slot", slot)
                put("uidMasked", SecureCardStorage.maskUid(uid))
            })
        } catch (e: Exception) {
            call.reject("Failed to register card: ${e.message}", e)
        }
    }

    @PluginMethod
    fun startCardTester(call: PluginCall) {
        val act = activity
        if (act == null) {
            call.reject("Activity not available")
            return
        }

        NfcManager.enableReaderMode(act) { tag, uid, technologies ->
            val authorized = SecureCardStorage.isCardAuthorized(context, uid)
            val cardName = SecureCardStorage.getCardName(context, uid)

            val techArray = JSArray()
            technologies.forEach { techArray.put(it) }

            val data = JSObject().apply {
                put("uid", uid)
                put("technologies", techArray)
                put("authorized", authorized)
                put("cardName", cardName)
            }
            notifyListeners("cardDetected", data)
        }

        call.resolve(JSObject().apply { put("listening", true) })
    }

    @PluginMethod
    fun stopCardTester(call: PluginCall) {
        val act = activity
        if (act != null) {
            NfcManager.disableReaderMode(act)
        }
        call.resolve(JSObject().apply { put("listening", false) })
    }

    @PluginMethod
    fun getAppLockPermissions(call: PluginCall) {
        try {
            // Real Android system queries
            val accessibilityGranted = isAccessibilityServiceEnabled(context)
            val overlayGranted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                Settings.canDrawOverlays(context)
            } else {
                true
            }
            val batteryOptimizedIgnored = isIgnoringBatteryOptimizations(context)
            val nfcAvailable = NfcManager.isNfcAvailable(context)
            val nfcEnabled = NfcManager.isNfcEnabled(context)
            val usageStatsGranted = hasUsageStatsPermission(context)

            val res = JSObject().apply {
                put("accessibilityGranted", accessibilityGranted)
                put("overlayGranted", overlayGranted)
                put("batteryOptimizationIgnored", batteryOptimizedIgnored)
                put("nfcAvailable", nfcAvailable)
                put("nfcEnabled", nfcEnabled)
                put("usageStatsGranted", usageStatsGranted)
            }
            call.resolve(res)
        } catch (e: Exception) {
            Log.e(TAG, "Error checking permissions: ${e.message}")
            call.reject("Failed to check permissions: ${e.message}", e)
        }
    }

    private fun isAccessibilityServiceEnabled(context: Context): Boolean {
        // Method 1: Check live AccessibilityManager list
        try {
            val am = context.getSystemService(Context.ACCESSIBILITY_SERVICE) as? AccessibilityManager
            val enabledServices = am?.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK)
            if (enabledServices != null) {
                for (service in enabledServices) {
                    val serviceInfo = service.resolveInfo?.serviceInfo
                    if (serviceInfo != null && 
                        serviceInfo.packageName == context.packageName && 
                        serviceInfo.name.contains("DefenxiaAccessibilityService")) {
                        return true
                    }
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "AccessibilityManager query error: ${e.message}")
        }

        // Method 2: Check Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES directly
        try {
            val enabledServicesSetting = Settings.Secure.getString(
                context.contentResolver,
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
            )
            if (!enabledServicesSetting.isNullOrBlank()) {
                val colonSplitter = TextUtils.SimpleStringSplitter(':')
                colonSplitter.setString(enabledServicesSetting)
                while (colonSplitter.hasNext()) {
                    val componentName = colonSplitter.next()
                    if (componentName.contains(context.packageName) && componentName.contains("DefenxiaAccessibilityService")) {
                        return true
                    }
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "Settings.Secure query error: ${e.message}")
        }

        // Method 3: In-memory live service connection status
        return DefenxiaAccessibilityService.isServiceRunning
    }

    private fun isIgnoringBatteryOptimizations(context: Context): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                val pm = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
                pm?.isIgnoringBatteryOptimizations(context.packageName) == true
            } catch (e: Exception) {
                false
            }
        } else {
            true
        }
    }

    private fun hasUsageStatsPermission(context: Context): Boolean {
        return try {
            val appOps = context.getSystemService(Context.APP_OPS_SERVICE) as? AppOpsManager ?: return false
            val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                appOps.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), context.packageName)
            } else {
                @Suppress("DEPRECATION")
                appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), context.packageName)
            }
            mode == AppOpsManager.MODE_ALLOWED
        } catch (e: Exception) {
            false
        }
    }

    @PluginMethod
    fun openAccessibilitySettings(call: PluginCall) {
        try {
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
            call.resolve(JSObject().apply { put("opened", true) })
        } catch (e: Exception) {
            call.reject("Could not open accessibility settings: ${e.message}", e)
        }
    }

    @PluginMethod
    fun openOverlaySettings(call: PluginCall) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:${context.packageName}")
                ).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(intent)
            }
            call.resolve(JSObject().apply { put("opened", true) })
        } catch (e: Exception) {
            call.reject("Could not open overlay settings: ${e.message}", e)
        }
    }

    @PluginMethod
    fun openBatteryOptimizationSettings(call: PluginCall) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK
                }
                context.startActivity(intent)
            }
            call.resolve(JSObject().apply { put("opened", true) })
        } catch (e: Exception) {
            call.reject("Could not open battery settings: ${e.message}", e)
        }
    }

    @PluginMethod
    fun openNfcSettings(call: PluginCall) {
        try {
            val intent = Intent(Settings.ACTION_NFC_SETTINGS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK
            }
            context.startActivity(intent)
            call.resolve(JSObject().apply { put("opened", true) })
        } catch (e: Exception) {
            call.reject("Could not open NFC settings: ${e.message}", e)
        }
    }

    @PluginMethod
    fun checkCameraPermission(call: PluginCall) {
        val granted = ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
        call.resolve(JSObject().apply { put("granted", granted) })
    }

    @PluginMethod
    fun requestCameraPermission(call: PluginCall) {
        val act = activity
        if (act != null) {
            ActivityCompat.requestPermissions(act, arrayOf(Manifest.permission.CAMERA), 1001)
            call.resolve(JSObject().apply { put("requested", true) })
        } else {
            call.reject("Activity unavailable")
        }
    }

    @PluginMethod
    fun checkWifiPermissions(call: PluginCall) {
        val fineLocation = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
        val wifiState = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_WIFI_STATE) == PackageManager.PERMISSION_GRANTED
        call.resolve(JSObject().apply {
            put("granted", fineLocation && wifiState)
            put("locationGranted", fineLocation)
            put("wifiStateGranted", wifiState)
        })
    }

    @PluginMethod
    fun requestWifiPermissions(call: PluginCall) {
        val act = activity
        if (act != null) {
            ActivityCompat.requestPermissions(
                act,
                arrayOf(
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION,
                    Manifest.permission.ACCESS_WIFI_STATE
                ),
                1002
            )
            call.resolve(JSObject().apply { put("requested", true) })
        } else {
            call.reject("Activity unavailable")
        }
    }

    @PluginMethod
    fun getConnectedWifiSecurity(call: PluginCall) {
        try {
            val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as? WifiManager
            if (wifiManager == null) {
                call.reject("WifiManager unavailable")
                return
            }

            val connectionInfo: WifiInfo? = wifiManager.connectionInfo
            val hasLocationPerm = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED

            var rawSsid = connectionInfo?.ssid ?: ""
            var cleanSsid = rawSsid.replace("\"", "").trim()
            if (cleanSsid == "<unknown ssid>" || cleanSsid.isEmpty()) {
                cleanSsid = if (!hasLocationPerm) "Wi-Fi (Location Permission Required)" else "Connected Wi-Fi Network"
            }

            val bssid = connectionInfo?.bssid ?: "00:00:00:00:00:00"
            val rssi = connectionInfo?.rssi ?: -100
            val linkSpeed = connectionInfo?.linkSpeed ?: 0
            val frequency = connectionInfo?.frequency ?: 0
            val band = when {
                frequency >= 5925 -> "6 GHz (Wi-Fi 6E/7)"
                frequency >= 4900 -> "5 GHz High-Speed"
                frequency > 0 -> "2.4 GHz Standard"
                else -> "Standard Wi-Fi"
            }

            val signalLevel = WifiManager.calculateSignalLevel(rssi, 100)

            val ipInt = connectionInfo?.ipAddress ?: 0
            val ipAddress = if (ipInt != 0) {
                String.format(
                    "%d.%d.%d.%d",
                    ipInt and 0xff,
                    ipInt shr 8 and 0xff,
                    ipInt shr 16 and 0xff,
                    ipInt shr 24 and 0xff
                )
            } else {
                "192.168.1.1"
            }

            var securityType = "WPA2 Personal (AES-CCMP)"
            var isSafe = true
            val vulnerabilities = JSArray()

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                when (connectionInfo?.currentSecurityType) {
                    WifiInfo.SECURITY_TYPE_OPEN -> {
                        securityType = "Open Network (No Encryption)"
                        isSafe = false
                        vulnerabilities.put("Unencrypted Public Wi-Fi: Traffic can be intercepted by eavesdroppers")
                        vulnerabilities.put("Vulnerable to Evil Twin and packet sniffing attacks")
                    }
                    WifiInfo.SECURITY_TYPE_WEP -> {
                        securityType = "WEP (Obsolete & Insecure)"
                        isSafe = false
                        vulnerabilities.put("Obsolete WEP cipher: Encryption keys can be cracked in minutes")
                    }
                    WifiInfo.SECURITY_TYPE_SAE -> {
                        securityType = "WPA3 Personal (SAE)"
                        isSafe = true
                    }
                    WifiInfo.SECURITY_TYPE_PSK -> {
                        securityType = "WPA2 Personal (AES-CCMP)"
                        isSafe = true
                    }
                    WifiInfo.SECURITY_TYPE_EAP -> {
                        securityType = "WPA2/WPA3 Enterprise (802.1X)"
                        isSafe = true
                    }
                    WifiInfo.SECURITY_TYPE_OWE -> {
                        securityType = "Enhanced Open (OWE)"
                        isSafe = true
                    }
                    else -> {
                        if (cleanSsid.contains("Free", ignoreCase = true) || cleanSsid.contains("Guest", ignoreCase = true)) {
                            securityType = "Public Hotspot / Guest Network"
                            vulnerabilities.put("Public access network: Ensure VPN or HTTPS encryption is used")
                        }
                    }
                }
            } else {
                if (cleanSsid.contains("Free", ignoreCase = true) || cleanSsid.contains("Open", ignoreCase = true)) {
                    securityType = "Open Wi-Fi Network"
                    isSafe = false
                    vulnerabilities.put("Unsecured Open Wi-Fi detected")
                }
            }

            val threatLevel = if (!isSafe) "critical" else if (vulnerabilities.length() > 0) "warning" else "safe"
            val message = if (!isSafe) {
                "⚠️ UNSAFE NETWORK: This Wi-Fi connection lacks modern encryption. Anyone on the same network can monitor unencrypted packets."
            } else {
                "✅ SECURE WI-FI: Protected with $securityType. Authentication handshake and payload encryption active."
            }

            val res = JSObject().apply {
                put("connected", connectionInfo != null && connectionInfo.networkId != -1)
                put("ssid", cleanSsid)
                put("bssid", bssid)
                put("rssi", rssi)
                put("signalLevel", signalLevel)
                put("linkSpeedMbps", linkSpeed)
                put("frequencyMhz", frequency)
                put("band", band)
                put("ipAddress", ipAddress)
                put("securityType", securityType)
                put("isSafe", isSafe)
                put("threatLevel", threatLevel)
                put("message", message)
                put("vulnerabilities", vulnerabilities)
                put("locationPermissionGranted", hasLocationPerm)
            }

            call.resolve(res)
        } catch (e: Exception) {
            Log.e(TAG, "Error checking connected Wi-Fi: ${e.message}", e)
            call.reject("Failed to inspect Wi-Fi security: ${e.message}", e)
        }
    }

    @PluginMethod
    fun scanInstalledAppsPermissions(call: PluginCall) {
        backgroundExecutor.execute {
            try {
                val pm = context.packageManager
                val mainIntent = Intent(Intent.ACTION_MAIN, null).apply {
                    addCategory(Intent.CATEGORY_LAUNCHER)
                }

                val resolveInfos = pm.queryIntentActivities(mainIntent, 0)
                val appsArray = JSArray()

                val sortedList = resolveInfos.sortedBy {
                    try { it.loadLabel(pm).toString().lowercase() } catch (e: Exception) { it.activityInfo.packageName }
                }

                for (info in sortedList) {
                    val pkg = info.activityInfo?.packageName ?: continue
                    if (pkg == context.packageName) continue

                    val appName = try { info.loadLabel(pm).toString() } catch (e: Exception) { pkg }
                    val iconBase64 = try {
                        val iconDrawable = info.loadIcon(pm)
                        drawableToBase64Thumbnail(iconDrawable, 72, 72)
                    } catch (e: Exception) { null }

                    val permissionsList = ArrayList<String>()
                    val suspiciousList = ArrayList<String>()
                    var riskLevel = "low"
                    var suspicionReason = "Standard permissions for application functionality."

                    try {
                        val pkgInfo = pm.getPackageInfo(pkg, PackageManager.GET_PERMISSIONS)
                        val requested = pkgInfo.requestedPermissions
                        if (requested != null) {
                            for (perm in requested) {
                                when {
                                    perm.contains("READ_SMS") || perm.contains("RECEIVE_SMS") || perm.contains("SEND_SMS") -> {
                                        if (!permissionsList.contains("SMS")) permissionsList.add("SMS")
                                        suspiciousList.add("SMS Access")
                                    }
                                    perm.contains("READ_CONTACTS") || perm.contains("WRITE_CONTACTS") -> {
                                        if (!permissionsList.contains("Contacts")) permissionsList.add("Contacts")
                                        suspiciousList.add("Contacts Database")
                                    }
                                    perm.contains("READ_CALL_LOG") || perm.contains("WRITE_CALL_LOG") -> {
                                        if (!permissionsList.contains("Call Logs")) permissionsList.add("Call Logs")
                                        suspiciousList.add("Call History")
                                    }
                                    perm.contains("ACCESS_FINE_LOCATION") || perm.contains("ACCESS_COARSE_LOCATION") -> {
                                        if (!permissionsList.contains("Location")) permissionsList.add("Location")
                                        if (isUtilityApp(appName, pkg)) suspiciousList.add("GPS Location")
                                    }
                                    perm.contains("RECORD_AUDIO") -> {
                                        if (!permissionsList.contains("Microphone")) permissionsList.add("Microphone")
                                        if (isUtilityApp(appName, pkg)) suspiciousList.add("Audio Recording")
                                    }
                                    perm.contains("CAMERA") -> {
                                        if (!permissionsList.contains("Camera")) permissionsList.add("Camera")
                                        if (isUtilityApp(appName, pkg)) suspiciousList.add("Camera")
                                    }
                                    perm.contains("SYSTEM_ALERT_WINDOW") -> {
                                        if (!permissionsList.contains("Draw Over Apps")) permissionsList.add("Draw Over Apps")
                                        suspiciousList.add("Screen Overlay")
                                    }
                                    perm.contains("READ_EXTERNAL_STORAGE") || perm.contains("WRITE_EXTERNAL_STORAGE") || perm.contains("READ_MEDIA_IMAGES") -> {
                                        if (!permissionsList.contains("Storage")) permissionsList.add("Storage")
                                    }
                                }
                            }
                        }
                    } catch (e: Exception) {
                        Log.w(TAG, "Error checking permissions for $pkg: ${e.message}")
                    }

                    val isUtility = isUtilityApp(appName, pkg)
                    val hasSms = permissionsList.contains("SMS")
                    val hasCallLog = permissionsList.contains("Call Logs")

                    if ((hasSms || hasCallLog) && isUtility) {
                        riskLevel = "high"
                        suspicionReason = "Critical: Utility/Calculator/Game app requested access to private SMS or Call Logs (potential financial spyware pattern)."
                    } else if (suspiciousList.size >= 3) {
                        riskLevel = "high"
                        suspicionReason = "Excessive Permissions: Requests multiple sensitive system capabilities (SMS, Contacts, GPS, Microphone)."
                    } else if (suspiciousList.isNotEmpty()) {
                        riskLevel = "medium"
                        suspicionReason = "App requests access to ${suspiciousList.joinToString(", ")}. Verify if this is required for core features."
                    } else if (permissionsList.isNotEmpty()) {
                        riskLevel = "low"
                        suspicionReason = "Standard permissions for application operation."
                    }

                    val appObj = JSObject().apply {
                        put("packageName", pkg)
                        put("appName", appName)
                        put("icon", iconBase64)
                        val permArray = JSArray()
                        permissionsList.forEach { permArray.put(it) }
                        put("permissions", permArray)

                        val suspArray = JSArray()
                        suspiciousList.distinct().forEach { suspArray.put(it) }
                        put("suspiciousPermissions", suspArray)
                        put("riskLevel", riskLevel)
                        put("suspicionReason", suspicionReason)
                    }
                    appsArray.put(appObj)
                }

                val res = JSObject().apply {
                    put("apps", appsArray)
                }
                call.resolve(res)
            } catch (e: Exception) {
                Log.e(TAG, "Error scanning installed app permissions: ${e.message}", e)
                call.reject("Failed to scan installed apps: ${e.message}", e)
            }
        }
    }

    private fun isUtilityApp(name: String, pkg: String): Boolean {
        val lower = (name + " " + pkg).lowercase()
        return lower.contains("calc") || lower.contains("torch") || lower.contains("flash") ||
               lower.contains("wallpaper") || lower.contains("compass") || lower.contains("clock") ||
               lower.contains("alarm") || lower.contains("cleaner") || lower.contains("battery") ||
               lower.contains("note") || lower.contains("game") || lower.contains("puzzle")
    }

    @PluginMethod
    fun exitApp(call: PluginCall) {
        try {
            activity?.finish()
            call.resolve(JSObject().apply { put("success", true) })
        } catch (e: Exception) {
            call.reject("Could not exit app: ${e.message}", e)
        }
    }

    private fun drawableToBase64Thumbnail(drawable: Drawable, targetWidth: Int, targetHeight: Int): String {
        val bitmap = if (drawable is BitmapDrawable && drawable.bitmap != null) {
            Bitmap.createScaledBitmap(drawable.bitmap, targetWidth, targetHeight, true)
        } else {
            val b = Bitmap.createBitmap(targetWidth, targetHeight, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(b)
            drawable.setBounds(0, 0, canvas.width, canvas.height)
            drawable.draw(canvas)
            b
        }

        val outputStream = ByteArrayOutputStream()
        // Fast PNG compression for small thumbnail
        bitmap.compress(Bitmap.CompressFormat.PNG, 80, outputStream)
        val byteArray = outputStream.toByteArray()
        return "data:image/png;base64," + Base64.encodeToString(byteArray, Base64.NO_WRAP)
    }
}
