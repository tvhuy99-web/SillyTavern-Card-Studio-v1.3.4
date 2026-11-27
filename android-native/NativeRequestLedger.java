package com.tvhuy99.cardstudio;

import java.util.LinkedHashSet;

final class NativeRequestLedger {
    private final LinkedHashSet<String> cancelled = new LinkedHashSet<>();
    static boolean valid(String id) { return id != null && id.matches("[A-Za-z0-9_-]{1,80}"); }
    void cancel(String id) {
        if (!valid(id)) return;
        cancelled.add(id);
        while (cancelled.size() > 128) cancelled.remove(cancelled.iterator().next());
    }
    boolean isCancelled(String id) { return cancelled.contains(id); }
}
