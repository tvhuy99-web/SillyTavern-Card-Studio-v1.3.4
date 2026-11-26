package com.tvhuy99.cardstudio;

import java.net.URI;

final class AiStudioOrigin {
    static final String ORIGIN = "https://aistudio.google.com";
    static boolean isStudioUrl(String url) {
        if (url == null) return false;
        try {
            URI uri = URI.create(url);
            return "https".equalsIgnoreCase(uri.getScheme()) &&
                "aistudio.google.com".equalsIgnoreCase(uri.getHost()) &&
                uri.getUserInfo() == null && (uri.getPort() == -1 || uri.getPort() == 443);
        } catch (IllegalArgumentException invalid) { return false; }
    }
}
