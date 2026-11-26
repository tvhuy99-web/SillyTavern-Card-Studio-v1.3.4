package com.tvhuy99.cardstudio;

/** Stable output alone is not enough; the website must be continuously idle. */
final class AiStudioCompletionPolicy {
    static final long CONFIRMED_IDLE_MS = 7_000L;
    static boolean isTerminal(boolean busy, boolean everSawBusy, long confirmedIdle, long stable, int consecutiveIdlePolls) {
        long idleRequirement = everSawBusy ? CONFIRMED_IDLE_MS : 15_000L;
        return !busy && confirmedIdle >= idleRequirement && consecutiveIdlePolls >= 4 && stable >= (everSawBusy ? 3500L : 15_000L);
    }
}
