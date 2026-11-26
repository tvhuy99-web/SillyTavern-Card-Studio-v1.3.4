package com.tvhuy99.cardstudio;

/** Export reservation spans picker, open, writes and close. Tokens prevent
 * queued work from being applied to a subsequent file. */
final class NativeExportSession {
    enum State { IDLE, PICKING, OPENING, OPEN, CLOSED }
    private State state = State.IDLE;
    private long revision;

    synchronized long begin() {
        if (state != State.IDLE) throw new IllegalStateException("Another export is active or closed");
        state = State.PICKING;
        return ++revision;
    }
    synchronized long current(State expected) {
        return state == expected ? revision : 0;
    }
    synchronized boolean transition(long token, State from, State to) {
        if (token == 0 || token != revision || state != from) return false;
        state = to;
        return true;
    }
    synchronized boolean isOpen(long token) {
        return token != 0 && token == revision && state == State.OPEN;
    }
    synchronized void release(long token) {
        if (token == revision && state != State.CLOSED) state = State.IDLE;
    }
    synchronized void close() { state = State.CLOSED; }
}
