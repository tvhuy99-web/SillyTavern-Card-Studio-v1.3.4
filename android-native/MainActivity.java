package com.tvhuy99.cardstudio;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

/** Registers the native capability adapters before Capacitor creates its bridge. */
public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AiStudioTextPlugin.class);
        registerPlugin(WorldInfoEmbeddingNativePlugin.class);
        registerPlugin(EmbeddingGemma2LiteRTPlugin.class);
        registerPlugin(AndroidExportFilePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
