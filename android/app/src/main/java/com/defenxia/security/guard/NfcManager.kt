package com.defenxia.security.guard

import android.app.Activity
import android.content.Context
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log

object NfcManager {

    private const val TAG = "DefenxiaNfcManager"

    fun isNfcAvailable(context: Context): Boolean {
        return try {
            val adapter = NfcAdapter.getDefaultAdapter(context)
            adapter != null
        } catch (e: Exception) {
            Log.e(TAG, "Error checking NFC availability: ${e.message}")
            false
        }
    }

    fun isNfcEnabled(context: Context): Boolean {
        return try {
            val adapter = NfcAdapter.getDefaultAdapter(context)
            adapter?.isEnabled == true
        } catch (e: Exception) {
            Log.e(TAG, "Error checking NFC enabled state: ${e.message}")
            false
        }
    }

    fun enableReaderMode(
        activity: Activity,
        onTagDiscovered: (tag: Tag, uid: String, techList: List<String>) -> Unit
    ) {
        try {
            val adapter = NfcAdapter.getDefaultAdapter(activity)
            if (adapter == null || !adapter.isEnabled) {
                Log.w(TAG, "NFC adapter is not available or disabled")
                return
            }

            // Universal flags for all standard RFID/NFC cards (ISO 14443 Type A, B, FeliCa, ISO 15693)
            val flags = NfcAdapter.FLAG_READER_NFC_A or
                    NfcAdapter.FLAG_READER_NFC_B or
                    NfcAdapter.FLAG_READER_NFC_F or
                    NfcAdapter.FLAG_READER_NFC_V or
                    NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK

            val options = Bundle().apply {
                // 150ms delay provides optimal balance across NXP (OnePlus) and STMicroelectronics (iQOO) controllers
                putInt(NfcAdapter.EXTRA_READER_PRESENCE_CHECK_DELAY, 150)
            }

            val mainHandler = Handler(Looper.getMainLooper())

            adapter.enableReaderMode(activity, { tag ->
                try {
                    val uidBytes = tag.id ?: byteArrayOf()
                    val uidFormatted = formatBytesToHex(uidBytes)
                    val technologies = tag.techList?.map { it.substringAfterLast('.') } ?: emptyList()

                    Log.d(TAG, "NFC Tag Discovered: UID=$uidFormatted, Tech=$technologies")

                    mainHandler.post {
                        onTagDiscovered(tag, uidFormatted, technologies)
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error processing discovered NFC tag: ${e.message}")
                }
            }, flags, options)
            Log.d(TAG, "NFC Reader Mode enabled successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to enable NFC reader mode: ${e.message}")
        }
    }

    fun disableReaderMode(activity: Activity) {
        try {
            val adapter = NfcAdapter.getDefaultAdapter(activity)
            adapter?.disableReaderMode(activity)
            Log.d(TAG, "NFC Reader Mode disabled")
        } catch (e: Exception) {
            Log.e(TAG, "Error disabling reader mode: ${e.message}")
        }
    }

    fun formatBytesToHex(bytes: ByteArray): String {
        if (bytes.isEmpty()) return ""
        return bytes.joinToString(":") { "%02X".format(it) }
    }
}
