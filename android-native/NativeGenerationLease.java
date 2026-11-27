package com.tvhuy99.cardstudio;

final class NativeGenerationLease {
    private String requested;
    synchronized void request(String token) { requested = token; }
    synchronized boolean owns(String token) { return token != null && token.equals(requested); }
    synchronized boolean release(String token) {
        if (!owns(token)) return false;
        requested = null;
        return true;
    }
}
