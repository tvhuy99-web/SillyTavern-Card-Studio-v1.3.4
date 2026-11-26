package com.tvhuy99.cardstudio;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.ThreadFactory;

/** One owner for native resources. Pending jobs are rejected on close;
 * the in-flight job finishes before cleanup (native inference is not interruptible).
 * The resource name also reserves ownership across Activity recreation, until
 * the previous instance's cleanup finishes. Never race two file/model workers. */
final class NativeSerialWorker {
    private static final Map<String, NativeSerialWorker> OWNERS = new HashMap<>();
    private final ExecutorService executor;
    private final String resource;
    private boolean closed;

    NativeSerialWorker(String name) {
        resource = name;
        ThreadFactory factory = job -> new Thread(job, name);
        executor = Executors.newSingleThreadExecutor(factory);
    }

    synchronized boolean isClosed() { return closed; }
    private boolean acquire() {
        synchronized (OWNERS) {
            NativeSerialWorker owner = OWNERS.get(resource);
            if (owner != null && owner != this) return false;
            OWNERS.put(resource, this);
            return true;
        }
    }
    private void release() {
        synchronized (OWNERS) { OWNERS.remove(resource, this); }
    }
    void submit(Runnable work, Runnable rejected) {
        synchronized (this) {
            if (!closed && acquire()) {
                executor.execute(() -> {
                    if (isClosed()) rejected.run();
                    else work.run();
                });
                return;
            }
        }
        rejected.run();
    }
    synchronized void close(Runnable cleanup) {
        if (closed) return;
        closed = true;
        executor.execute(() -> {
            try { cleanup.run(); }
            finally { release(); }
        });
        executor.shutdown();
    }
}
