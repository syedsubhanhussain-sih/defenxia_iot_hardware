package com.defenxia.security.guard

import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.util.Log
import android.view.View
import android.view.animation.AlphaAnimation
import android.view.animation.Animation
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

/**
 * Defenxia Master Lock Screen Overlay Activity.
 * 
 * Intercepts protected applications and displays the Defenxia Master Visual Design
 * (@drawable/defenxia_lock_overlay) with a dynamic LockedAppHeader resolving the real
 * icon and name of whichever app is currently being guarded.
 * 
 * Manages physical NFC authentication, card authorization against SecureCardStorage,
 * target package foregrounding, and safe home navigation.
 */
class NfcLockActivity : AppCompatActivity() {

    companion object {
        private const val TAG = "DefenxiaNfcLock"
        const val EXTRA_PACKAGE_NAME = "extra_target_package"
    }

    private var targetPackage: String? = null

    private lateinit var lockedAppHeader: LockedAppHeader
    private lateinit var viewStatusDot: View
    private lateinit var tvStatusBadge: TextView
    private lateinit var tvStatusMessage: TextView
    private lateinit var tvUidInfo: TextView
    private lateinit var btnExitToHome: View
    private lateinit var nfcGlowRing: View

    @Volatile
    private var isUnlocked = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_nfc_lock)

        targetPackage = intent.getStringExtra(EXTRA_PACKAGE_NAME)
        isUnlocked = false

        initViews()
        loadTargetAppDetails()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        targetPackage = intent.getStringExtra(EXTRA_PACKAGE_NAME)
        isUnlocked = false
        Log.d(TAG, "onNewIntent received for package: $targetPackage")
        loadTargetAppDetails()
        resetUiState()
    }

    private fun initViews() {
        lockedAppHeader = findViewById(R.id.lockedAppHeader)
        viewStatusDot = findViewById(R.id.viewStatusDot)
        tvStatusBadge = findViewById(R.id.tvStatusBadge)
        tvStatusMessage = findViewById(R.id.tvStatusMessage)
        tvUidInfo = findViewById(R.id.tvUidInfo)
        btnExitToHome = findViewById(R.id.btnExitToHome)
        nfcGlowRing = findViewById(R.id.nfcGlowRing)

        btnExitToHome.setOnClickListener {
            goToHomeScreen()
        }

        startSubtleGlowPulse()
    }

    private fun loadTargetAppDetails() {
        lockedAppHeader.bind(targetPackage)
    }

    private fun resetUiState() {
        viewStatusDot.setBackgroundResource(R.drawable.bg_status_dot_ready)
        tvStatusBadge.text = "READY"
        tvStatusBadge.setTextColor(Color.parseColor("#10B981"))
        tvStatusMessage.text = "Waiting for NFC Card tap..."
        tvStatusMessage.setTextColor(Color.parseColor("#E2E8F0"))
        tvUidInfo.visibility = View.GONE
        nfcGlowRing.alpha = 0.0f
    }

    private fun startSubtleGlowPulse() {
        val pulse = AlphaAnimation(0.0f, 0.25f).apply {
            duration = 1800
            repeatMode = Animation.REVERSE
            repeatCount = Animation.INFINITE
        }
        nfcGlowRing.startAnimation(pulse)
    }

    override fun onResume() {
        super.onResume()
        isUnlocked = false

        if (!NfcManager.isNfcAvailable(this)) {
            viewStatusDot.setBackgroundResource(R.drawable.bg_status_dot_error)
            tvStatusBadge.text = "NO NFC"
            tvStatusBadge.setTextColor(Color.parseColor("#EF4444"))
            tvStatusMessage.text = "NFC hardware is not available on this device"
            tvStatusMessage.setTextColor(Color.parseColor("#EF4444"))
            return
        }

        if (!NfcManager.isNfcEnabled(this)) {
            viewStatusDot.setBackgroundResource(R.drawable.bg_status_dot_error)
            tvStatusBadge.text = "NFC OFF"
            tvStatusBadge.setTextColor(Color.parseColor("#F59E0B"))
            tvStatusMessage.text = "Please enable NFC in Android Settings"
            tvStatusMessage.setTextColor(Color.parseColor("#F59E0B"))
            return
        }

        resetUiState()

        // Activate real physical NFC reader mode
        NfcManager.enableReaderMode(this) { _, uid, technologies ->
            onNfcCardScanned(uid, technologies)
        }
    }

    override fun onPause() {
        super.onPause()
        NfcManager.disableReaderMode(this)
    }

    private fun onNfcCardScanned(uid: String, technologies: List<String>) {
        if (isUnlocked) return

        // 1. Show verifying state immediately
        viewStatusDot.setBackgroundResource(R.drawable.bg_status_dot_verifying)
        tvStatusBadge.text = "VERIFYING"
        tvStatusBadge.setTextColor(Color.parseColor("#38BDF8"))
        tvStatusMessage.text = "Authenticating card credentials..."
        tvUidInfo.visibility = View.VISIBLE
        tvUidInfo.text = "Card UID: $uid (${technologies.joinToString(", ")})"

        val isAuthorized = SecureCardStorage.isCardAuthorized(this, uid)
        val cardName = SecureCardStorage.getCardName(this, uid)

        if (isAuthorized) {
            isUnlocked = true
            vibrateSuccess()

            viewStatusDot.setBackgroundResource(R.drawable.bg_status_dot_ready)
            tvStatusBadge.text = "UNLOCKED"
            tvStatusBadge.setTextColor(Color.parseColor("#10B981"))
            val appLabel = lockedAppHeader.getDisplayedAppName()
            tvStatusMessage.text = "Access Granted ($cardName)! Unlocking $appLabel..."
            tvStatusMessage.setTextColor(Color.parseColor("#10B981"))

            // Unlock package according to user configured policy
            targetPackage?.let { pkg ->
                val timeout = SecureCardStorage.getLockTimeoutSeconds(this)
                val effectiveTimeout = if (timeout <= 0) 30 else timeout
                SecureCardStorage.unlockPackage(pkg, durationSeconds = effectiveTimeout)

                // Directly launch target app into foreground so user is never redirected to Defenxia
                try {
                    val launchIntent = packageManager.getLaunchIntentForPackage(pkg)
                    if (launchIntent != null) {
                        launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)
                        startActivity(launchIntent)
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error bringing target package $pkg to front: ${e.message}")
                }
                Unit
            }

            // Dismiss lock overlay quickly with zero transition lag
            Handler(Looper.getMainLooper()).postDelayed({
                finish()
                @Suppress("DEPRECATION")
                overridePendingTransition(0, 0)
            }, 300)
        } else {
            vibrateError()
            viewStatusDot.setBackgroundResource(R.drawable.bg_status_dot_error)
            tvStatusBadge.text = "DENIED"
            tvStatusBadge.setTextColor(Color.parseColor("#EF4444"))
            tvStatusMessage.text = "Unauthorized Card ($uid)"
            tvStatusMessage.setTextColor(Color.parseColor("#EF4444"))
        }
    }

    private fun vibrateSuccess() {
        try {
            val vibrator = getVibratorService()
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator?.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 60, 40, 60), -1))
            } else {
                @Suppress("DEPRECATION")
                vibrator?.vibrate(100)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Vibration failed: ${e.message}")
        }
    }

    private fun vibrateError() {
        try {
            val vibrator = getVibratorService()
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                vibrator?.vibrate(VibrationEffect.createWaveform(longArrayOf(0, 150, 80, 150), -1))
            } else {
                @Suppress("DEPRECATION")
                vibrator?.vibrate(300)
            }
        } catch (e: Exception) {
            Log.w(TAG, "Vibration failed: ${e.message}")
        }
    }

    private fun getVibratorService(): Vibrator? {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            val vibratorManager = getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager
            vibratorManager?.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        }
    }

    @Suppress("DEPRECATION")
    override fun onBackPressed() {
        // Prevent bypassing lock by pressing back - safe exit to home
        goToHomeScreen()
    }

    @Suppress("DEPRECATION")
    private fun goToHomeScreen() {
        val homeIntent = Intent(Intent.ACTION_MAIN).apply {
            addCategory(Intent.CATEGORY_HOME)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK
        }
        startActivity(homeIntent)
        finish()
        overridePendingTransition(0, 0)
    }

    override fun onDestroy() {
        super.onDestroy()
        NfcManager.disableReaderMode(this)
    }
}
