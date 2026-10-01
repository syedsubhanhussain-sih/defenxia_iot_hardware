package com.defenxia.security.guard

import android.content.Context
import android.content.pm.PackageManager
import android.graphics.drawable.Drawable
import android.util.AttributeSet
import android.util.Log
import android.util.LruCache
import android.view.LayoutInflater
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.TextView

/**
 * Reusable dynamic app header component for the Defenxia Master Lock Overlay.
 * 
 * Automatically resolves the application icon and label for whichever application
 * is currently intercepted/locked (e.g., Instagram, WhatsApp, YouTube, Banking apps),
 * utilizing an in-memory LruCache to ensure instant rendering without redundant IPC calls.
 */
class LockedAppHeader @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : FrameLayout(context, attrs, defStyleAttr) {

    companion object {
        private const val TAG = "LockedAppHeader"

        data class CachedAppInfo(
            val label: String,
            val icon: Drawable
        )

        // Cache up to 30 app identities in memory for ultra-smooth lock screen launches
        private val memoryCache = LruCache<String, CachedAppInfo>(30)
    }

    private val ivAppIcon: ImageView
    private val tvAppName: TextView
    private val tvBadge: TextView

    private var currentPackage: String? = null

    init {
        LayoutInflater.from(context).inflate(R.layout.view_locked_app_header, this, true)
        ivAppIcon = findViewById(R.id.ivHeaderAppIcon)
        tvAppName = findViewById(R.id.tvHeaderAppName)
        tvBadge = findViewById(R.id.tvHeaderBadge)
    }

    /**
     * Dynamically binds the target locked package to the header UI.
     */
    fun bind(packageName: String?) {
        currentPackage = packageName

        if (packageName.isNullOrBlank()) {
            setFallback("Protected Application")
            return
        }

        // Check memory cache first
        val cached = memoryCache.get(packageName)
        if (cached != null) {
            tvAppName.text = cached.label
            ivAppIcon.setImageDrawable(cached.icon)
            tvBadge.text = "DEFENXIA SHIELDED"
            return
        }

        // Resolve via PackageManager
        try {
            val pm = context.packageManager
            val appInfo = pm.getApplicationInfo(packageName, 0)
            val label = pm.getApplicationLabel(appInfo).toString()
            val icon = pm.getApplicationIcon(appInfo)

            tvAppName.text = label
            ivAppIcon.setImageDrawable(icon)
            tvBadge.text = "DEFENXIA SHIELDED"

            // Store in cache
            memoryCache.put(packageName, CachedAppInfo(label, icon))
        } catch (e: PackageManager.NameNotFoundException) {
            Log.w(TAG, "Package name not found: $packageName")
            setFallback(packageName)
        } catch (e: Exception) {
            Log.e(TAG, "Error resolving app info for $packageName: ${e.message}")
            setFallback(packageName)
        }
    }

    private fun setFallback(fallbackTitle: String) {
        tvAppName.text = fallbackTitle
        ivAppIcon.setImageResource(android.R.drawable.ic_lock_lock)
        tvBadge.text = "HARDWARE PROTECTED"
    }

    fun getDisplayedAppName(): String {
        return tvAppName.text?.toString() ?: "Protected Application"
    }
}
