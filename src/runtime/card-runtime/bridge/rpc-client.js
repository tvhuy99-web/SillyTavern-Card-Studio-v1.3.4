export function createRpcClient({ send, makeId, readContext, clone, onTimeout = () => {}, schedule = setTimeout, cancel = clearTimeout }) {
    const pending = new Map();
    let closed = false;

    function settle(requestId, ok, value) {
        const entry = pending.get(requestId);
        if (!entry) return false;
        pending.delete(requestId);
        cancel(entry.timer);
        if (ok) entry.resolve(value);
        else entry.reject(value);
        return true;
    }

    function request(method, args, timeoutMs) {
        if (closed) return Promise.reject(new Error('Card runtime bridge is closed.'));
        return new Promise((resolve, reject) => {
            const requestId = makeId();
            if (pending.has(requestId)) { reject(new Error('Duplicate card runtime request ID.')); return; }
            const entry = { resolve, reject, timer: null };
            pending.set(requestId, entry);
            try {
                entry.timer = schedule(() => {
                    const message = 'Card runtime request timed out: ' + method;
                    if (settle(requestId, false, new Error(message))) {
                        try { onTimeout(method, message); } catch (_) {}
                    }
                }, Math.max(1000, timeoutMs || 30000));
                send({ type: 'CARD_RUNTIME_RPC', requestId, method, args: clone(args || {}), context: clone(readContext()) });
            } catch (error) {
                settle(requestId, false, error);
            }
        });
    }

    function receive(data) {
        if (!data || data.type !== 'CARD_RUNTIME_RPC_RESULT' || !pending.has(data.requestId)) return false;
        return settle(data.requestId, Boolean(data.ok), data.ok ? data.result : new Error(data.error || 'Card runtime request failed.'));
    }

    function cancelPending(reason = 'Card runtime bridge is closed.') {
        for (const id of pending.keys()) settle(id, false, new Error(reason));
    }

    function close() {
        closed = true;
        cancelPending();
    }

    return Object.freeze({ request, receive, cancelPending, close });
}
