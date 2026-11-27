package com.tvhuy99.cardstudio;

final class AiStudioCompletionPolicy {
    static final long CONFIRMED_IDLE_MS = 7_000L;
    static boolean isTerminal(boolean busy, boolean everSawBusy, long confirmedIdle, long stable, int consecutiveIdlePolls) {
        long idleRequirement = everSawBusy ? CONFIRMED_IDLE_MS : 15_000L;
        return !busy && confirmedIdle >= idleRequirement && consecutiveIdlePolls >= 4 && stable >= (everSawBusy ? 3500L : 15_000L);
    }
}
