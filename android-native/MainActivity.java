package com.tvhuy99.cardstudio;

import android.os.Bundle;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AiStudioTextPlugin.class);
        registerPlugin(WorldInfoEmbeddingNativePlugin.class);
        registerPlugin(EmbeddingGemma2LiteRTPlugin.class);
        registerPlugin(AndroidExportFilePlugin.class);
        super.onCreate(savedInstanceState);

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            private boolean checkingDialog;

            @Override public void handleOnBackPressed() {
                if (checkingDialog) return;
                checkingDialog = true;
                getBridge().getWebView().evaluateJavascript(
                    "(() => {"
                    + "const dialogs = document.querySelectorAll('dialog[data-sts-anchored-dialog][open]');"
                    + "const dialog = dialogs[dialogs.length - 1];"
                    + "if (!dialog) return false;"
                    + "if (dialog.dispatchEvent(new Event('cancel', {cancelable: true}))) dialog.close();"
                    + "return true;"
                    + "})()",
                    result -> {
                        checkingDialog = false;
                        if (!"true".equals(result)) {
                            setEnabled(false);
                            getOnBackPressedDispatcher().onBackPressed();
                            setEnabled(true);
                        }
                    }
                );
            }
        });
    }
}
