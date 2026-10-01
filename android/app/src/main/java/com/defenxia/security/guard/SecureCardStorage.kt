package com.defenxia.security.guard

import android.content.Context
import android.content.SharedPreferences
import android.util.Log

object SecureCardStorage {

    private const val TAG = "DefenxiaCardStorage"
    private const val PREFS_NAME = "defenxia_secure_banking_prefs"
    private const val KEY_BLUE_CARD_UID = "blue_card_uid"
    private const val KEY_WHITE_CARD_UID = "white_card_uid"
    private const val KEY_PROTECTED_PACKAGES = "protected_packages"
    private const val KEY_LOCK_TIMEOUT_SECONDS = "lock_timeout_seconds"

    // Default pre-seeded UID from user's physical scan (97:B4:E9:00)
    const val DEFAULT_BLUE_CARD_UID = "97:B4:E9:00"

    // Lock policies
    const val POLICY_IMMEDIATE = 0 // Lock as soon as user leaves the app (Default & most secure)
    const val POLICY_30_SECONDS = 30
    const val POLICY_60_SECONDS = 60
    const val POLICY_300_SECONDS = 300 // 5 minutes

    data class UnlockSession(
        val packageName: String,
        val unlockedAt: Long,
        var lastForegroundAt: Long,
        var isActivelyForeground: Boolean,
        val durationSeconds: Int
    )

    // In-memory active unlock sessions: PackageName -> UnlockSession
    private val activeSessions = mutableMapOf<String, UnlockSession>()

    // Track which protected package was last in the foreground
    @Volatile
    var lastForegroundProtectedPackage: String? = null

    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    fun getBlueCardUid(context: Context): String {
        return getPrefs(context).getString(KEY_BLUE_CARD_UID, DEFAULT_BLUE_CARD_UID) ?: DEFAULT_BLUE_CARD_UID
    }

    fun setBlueCardUid(context: Context, uid: String) {
        val normalized = normalizeUid(uid)
        getPrefs(context).edit().putString(KEY_BLUE_CARD_UID, normalized).apply()
        Log.i(TAG, "Blue Card UID updated to: $normalized")
    }

    fun getWhiteCardUid(context: Context): String? {
        return getPrefs(context).getString(KEY_WHITE_CARD_UID, null)
    }

    fun setWhiteCardUid(context: Context, uid: String) {
        val normalized = normalizeUid(uid)
        getPrefs(context).edit().putString(KEY_WHITE_CARD_UID, normalized).apply()
        Log.i(TAG, "White Card UID updated to: $normalized")
    }

    fun getLockTimeoutSeconds(context: Context): Int {
        return getPrefs(context).getInt(KEY_LOCK_TIMEOUT_SECONDS, POLICY_IMMEDIATE)
    }

    fun setLockTimeoutSeconds(context: Context, seconds: Int) {
        getPrefs(context).edit().putInt(KEY_LOCK_TIMEOUT_SECONDS, seconds).apply()
    }

    fun getProtectedPackages(context: Context): Set<String> {
        val defaultProtected = setOf(
            "com.phonepe.app",
            "com.google.android.apps.nbu.paisa.user",
            "net.one97.paytm",
            "in.org.npci.upiapp",
            "com.sbi.lotusintouch"
        )
        return getPrefs(context).getStringSet(KEY_PROTECTED_PACKAGES, defaultProtected) ?: defaultProtected
    }

    fun setProtectedPackages(context: Context, packages: Set<String>) {
        getPrefs(context).edit().putStringSet(KEY_PROTECTED_PACKAGES, packages).apply()
        Log.i(TAG, "Protected packages updated (${packages.size} packages)")
    }

    fun isPackageProtected(context: Context, packageName: String): Boolean {
        if (packageName == context.packageName) return false
        val protectedList = getProtectedPackages(context)
        return protectedList.contains(packageName)
    }

    @Synchronized
    fun isPackageUnlocked(packageName: String): Boolean {
        val session = activeSessions[packageName] ?: return false
        val now = System.currentTimeMillis()

        // If the app is actively in the foreground, it remains unlocked
        if (session.isActivelyForeground) {
            session.lastForegroundAt = now
            return true
        }

        // If timeout is IMMEDIATE (0), leaving foreground invalidates unlock immediately
        if (session.durationSeconds == POLICY_IMMEDIATE) {
            Log.d(TAG, "Session for $packageName expired immediately upon backgrounding")
            activeSessions.remove(packageName)
            return false
        }

        // If a timeout window is configured, check if within grace period
        val gracePeriodMillis = session.durationSeconds * 1000L
        if (now - session.lastForegroundAt < gracePeriodMillis) {
            return true
        }

        // Grace period expired
        Log.d(TAG, "Session grace period expired for $packageName")
        activeSessions.remove(packageName)
        return false
    }

    @Synchronized
    fun unlockPackage(packageName: String, durationSeconds: Int = POLICY_IMMEDIATE) {
        val now = System.currentTimeMillis()
        activeSessions[packageName] = UnlockSession(
            packageName = packageName,
            unlockedAt = now,
            lastForegroundAt = now,
            isActivelyForeground = true,
            durationSeconds = durationSeconds
        )
        lastForegroundProtectedPackage = packageName
        Log.i(TAG, "Package $packageName unlocked successfully (policy: $durationSeconds sec)")
    }

    @Synchronized
    fun onPackageForegrounded(packageName: String) {
        val session = activeSessions[packageName]
        if (session != null) {
            session.isActivelyForeground = true
            session.lastForegroundAt = System.currentTimeMillis()
        }
        lastForegroundProtectedPackage = packageName
    }

    @Synchronized
    fun onPackageBackgrounded(packageName: String) {
        val session = activeSessions[packageName]
        if (session != null) {
            session.isActivelyForeground = false
            session.lastForegroundAt = System.currentTimeMillis()
            if (session.durationSeconds == POLICY_IMMEDIATE) {
                // Immediate re-lock policy: wipe session now so next launch MUST authenticate
                activeSessions.remove(packageName)
                Log.d(TAG, "Locked $packageName immediately upon backgrounding")
            }
        }
        if (lastForegroundProtectedPackage == packageName) {
            lastForegroundProtectedPackage = null
        }
    }

    @Synchronized
    fun lockPackage(packageName: String) {
        activeSessions.remove(packageName)
        if (lastForegroundProtectedPackage == packageName) {
            lastForegroundProtectedPackage = null
        }
        Log.d(TAG, "Locked $packageName")
    }

    @Synchronized
    fun lockAllPackages() {
        activeSessions.clear()
        lastForegroundProtectedPackage = null
        Log.i(TAG, "All protected packages locked (session invalidated)")
    }

    fun isCardAuthorized(context: Context, scannedUid: String): Boolean {
        val normalizedScanned = normalizeUid(scannedUid)
        val blue = normalizeUid(getBlueCardUid(context))
        val white = getWhiteCardUid(context)?.let { normalizeUid(it) }

        if (normalizedScanned.isEmpty()) return false
        if (normalizedScanned == blue) return true
        if (white != null && normalizedScanned == white) return true

        // Also match without colons (e.g. 97B4E900 vs 97:B4:E9:00)
        val rawScanned = normalizedScanned.replace(":", "")
        if (rawScanned.equals(blue.replace(":", ""), ignoreCase = true)) return true
        if (white != null && rawScanned.equals(white.replace(":", ""), ignoreCase = true)) return true

        return false
    }

    fun getCardName(context: Context, scannedUid: String): String {
        val normalizedScanned = normalizeUid(scannedUid).replace(":", "")
        val blue = normalizeUid(getBlueCardUid(context)).replace(":", "")
        val white = getWhiteCardUid(context)?.let { normalizeUid(it).replace(":", "") }

        return when {
            normalizedScanned.equals(blue, ignoreCase = true) -> "Blue Security KeyFob"
            white != null && normalizedScanned.equals(white, ignoreCase = true) -> "White Security Card"
            else -> "Unknown Card"
        }
    }

    fun maskUid(uid: String?): String {
        if (uid.isNullOrBlank()) return "Not Configured"
        val parts = uid.split(":")
        return if (parts.size >= 4) {
            "${parts[0]}:${parts[1]}:**:**"
        } else if (uid.length >= 8) {
            "${uid.substring(0, 4)}****"
        } else {
            "****"
        }
    }

    fun normalizeUid(uid: String): String {
        val cleaned = uid.trim().uppercase().replace(" ", "").replace("-", ":")
        return if (!cleaned.contains(":") && cleaned.length >= 8 && cleaned.length % 2 == 0) {
            cleaned.chunked(2).joinToString(":")
        } else {
            cleaned
        }
    }
}
