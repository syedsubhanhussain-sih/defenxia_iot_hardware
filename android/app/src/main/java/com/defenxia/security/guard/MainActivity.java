package com.defenxia.security.guard;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import androidx.core.view.ViewCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final String TAG = "MainActivity";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DefenxiaNfcPlugin.class);
        super.onCreate(savedInstanceState);

        // Handle deep link if app launched via OAuth URL
        handleDeepLinkIntent(getIntent());

        // Ensure system window insets (status bar, display cutout/notch) are handled properly
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(android.R.id.content), (view, insets) -> {
            return insets;
        });
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        // Handle deep link when brought to foreground from Chrome
        handleDeepLinkIntent(intent);
    }

    private void handleDeepLinkIntent(Intent intent) {
        if (intent == null || intent.getData() == null) return;
        Uri data = intent.getData();
        String uriString = data.toString();
        Log.d(TAG, "Incoming OAuth / deep link: " + uriString);

        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().postDelayed(() -> {
                String safeUri = uriString.replace("'", "\\'");
                String js = "(function() {" +
                    "  console.log('[Defenxia Native] Dispatching deep link: ' + '" + safeUri + "');" +
                    "  var ev = new CustomEvent('defenxia:deepLink', { detail: { url: '" + safeUri + "' } });" +
                    "  window.dispatchEvent(ev);" +
                    "})();";
                getBridge().getWebView().evaluateJavascript(js, null);
            }, 300);
        }
    }

    @Override
    public void onBackPressed() {
        // Dispatch hardware back event to React SPA so React Router navigates back instead of exiting
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().evaluateJavascript(
                "(function() {" +
                "  var ev = new CustomEvent('defenxia:hardwareBack', { cancelable: true });" +
                "  var dispatched = window.dispatchEvent(ev);" +
                "  return dispatched;" +
                "})();",
                null
            );
        } else {
            super.onBackPressed();
        }
    }
}
