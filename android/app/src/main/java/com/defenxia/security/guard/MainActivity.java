package com.defenxia.security.guard;

import android.content.Intent;
import android.os.Bundle;
import androidx.core.view.ViewCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(DefenxiaNfcPlugin.class);
        super.onCreate(savedInstanceState);

        // Ensure system window insets (status bar, display cutout/notch) are handled properly
        ViewCompat.setOnApplyWindowInsetsListener(findViewById(android.R.id.content), (view, insets) -> {
            return insets;
        });
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
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
