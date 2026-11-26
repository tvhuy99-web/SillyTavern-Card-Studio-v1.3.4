import { awaitAbortable } from '../../../../m4/core/async/cancellation.js';
// Summary coordination belongs to the conversation feature, not the application shell.
import { summaryChunkSize } from '../history-policy.js';
function findTurnRange(messages, firstTurn, endTurn) {
    let start = 0, end = -1, turn = 0;
    for (let index = 0; index < messages.length; index++) {
        if (messages[index].role !== 'model') continue;
        turn++;
        if (turn === firstTurn) start = index + 1;
        if (turn === endTurn) { end = index + 1; break; }
    }
    return { start, end };
}

export function useSmartContext(dependencies) {
    const { messages, longTermSummaries, setSessionData, card, summaryQueue, isSummarizing, sessionId } = (0, dependencies.ol)();
    const runtime = dependencies.__stsRuntimeState;
    const revision = runtime.getSessionRevision();
    const readState = () => dependencies.ol.getState();
    const sameHistory = (start, snapshot) => snapshot.every((message, offset) => {
        const current = readState().messages[start + offset];
        return current && current.id === message.id && current.role === message.role && current.content === message.content;
    });
    const sameSummaries = snapshot => {
        const current = readState().longTermSummaries;
        return current.length === snapshot.length && snapshot.every((summary, index) => current[index] === summary);
    };
    const startTask = () => { const controller = new AbortController(); runtime.add?.(controller, {source:'summary'}); return controller; };
    const finishTask = controller => runtime.remove?.(controller, {source:'summary'});
    const isCurrent = () => dependencies.__stsRuntimeState.getSessionRevision() === revision && dependencies.ol.getState().sessionId === sessionId;
    const triggerSummarization = dependencies.b.useCallback(async (retry = false) => {
        if (!isCurrent() || isSummarizing || dependencies.ol.getState().isSummarizing) return;
        const {messages, longTermSummaries, summaryQueue, card} = readState();
        const failedTask = summaryQueue?.find(task => task.status === 'failed');
        if (failedTask && !retry) return;
        const settings = (0, dependencies.os)();
        const chunkSize = summaryChunkSize(settings, readState());
        const firstTurn = longTermSummaries.length * chunkSize;
        const { start, end } = findTurnRange(messages, firstTurn, firstTurn + chunkSize);
        if (end === -1) return;
        const id = failedTask?.id || `summary-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const timestamp = failedTask?.timestamp || Date.now();
        const history = messages.slice(start, end).map(message => ({...message}));
        const prior = [...longTermSummaries];
        const controller = startTask();
        try {
            setSessionData({ isSummarizing: true, summaryQueue: [{ id, status: 'processing', timestamp }] });
            (0, dependencies.qu)('log', 'system', `Smart Context: Đang tóm tắt lượt ${firstTurn + 1} đến ${firstTurn + chunkSize}...`);
            const recent = longTermSummaries.slice(-5).join('\n---\n') || '(Chưa có bối cảnh trước đó)';
            const prompt = (settings.summarization_prompt || '').replace('{{recent_summaries}}', recent);
            const summary = await awaitAbortable(() => dependencies.wd(history, card?.name || 'Character', prompt, controller.signal), controller.signal);
            if (!isCurrent()) return;
            if (!sameHistory(start, history) || !sameSummaries(prior) || summaryChunkSize(dependencies.os(), readState()) !== chunkSize) {
                if (readState().summaryQueue?.[0]?.id === id) setSessionData({summaryQueue: []});
                return;
            }
            if (readState().summaryQueue?.[0]?.id !== id) return;
            if (!summary?.trim()) throw Error('API không trả về nội dung tóm tắt.');
            const updated = [...prior, summary];
            setSessionData({ longTermSummaries: updated, summaryChunkSize: chunkSize, summaryQueue: [] });
            (0, dependencies.qu)('script-success', 'system', `Đã lưu tóm tắt #${updated.length} vào bộ nhớ dài hạn.`);
        } catch (error) {
            if (!isCurrent() || readState().summaryQueue?.[0]?.id !== id) return;
            const message = controller.signal.aborted ? 'Đã hủy tóm tắt.' : error instanceof Error ? error.message : String(error);
            setSessionData({ summaryQueue: [{ id, status: 'failed', timestamp, error: message }] });
            (0, dependencies.qu)('error', 'system', `Lỗi tóm tắt dữ liệu: ${message}`);
        } finally {
            finishTask(controller);
            if (isCurrent()) setSessionData({ isSummarizing: false });
        }
    }, [messages, longTermSummaries, card, setSessionData, isSummarizing, summaryQueue, sessionId, revision]);
    const retryFailedTask = dependencies.b.useCallback(async () => {
        if (isCurrent() && summaryQueue?.some(task => task.status === 'failed')) {
            (0, dependencies.qu)('log', 'system', 'Đang thử lại tác vụ tóm tắt bị lỗi...');
            await triggerSummarization(true);
        }
    }, [summaryQueue, triggerSummarization, sessionId, revision]);
    const regenerateSummary = dependencies.b.useCallback(async index => {
        if (!isCurrent() || readState().isSummarizing || !Number.isSafeInteger(index) || index < 0) return;
        const {messages, longTermSummaries, card} = readState();
        if (index >= longTermSummaries.length) return;
        const settings = (0, dependencies.os)();
        const chunkSize = summaryChunkSize(settings, readState());
        const { start, end } = findTurnRange(messages, index * chunkSize, (index + 1) * chunkSize);
        if (end === -1) {
            (0, dependencies.qu)('error', 'system', `Không tìm thấy đủ dữ liệu gốc để tạo lại tóm tắt #${index + 1}.`);
            return;
        }
        const history = messages.slice(start, end).map(message => ({...message}));
        const prior = [...longTermSummaries];
        const controller = startTask();
        try {
            setSessionData({isSummarizing:true});
            (0, dependencies.qu)('log', 'system', `Đang tạo lại tóm tắt #${index + 1} (Dựa trên dữ liệu gốc)...`);
            const recent = longTermSummaries.slice(0, index).slice(-5).join('\n---\n') || '(Chưa có bối cảnh trước đó)';
            const prompt = (settings.summarization_prompt || '').replace('{{recent_summaries}}', recent);
            const summary = await awaitAbortable(() => dependencies.wd(history, card?.name || 'Character', prompt, controller.signal), controller.signal);
            if (isCurrent() && sameHistory(start, history) && sameSummaries(prior) && summaryChunkSize(dependencies.os(), readState()) === chunkSize && summary?.trim()) {
                const updated = [...dependencies.ol.getState().longTermSummaries];
                updated[index] = summary;
                setSessionData({ longTermSummaries: updated, summaryChunkSize: chunkSize });
                (0, dependencies.qu)('script-success', 'system', `Đã cập nhật lại nội dung tóm tắt #${index + 1}.`);
            }
        } catch (error) {
            if (isCurrent() && !controller.signal.aborted) (0, dependencies.qu)('error', 'system', `Lỗi tạo lại tóm tắt: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            finishTask(controller);
            if (isCurrent()) setSessionData({isSummarizing:false});
        }
    }, [messages, longTermSummaries, card, setSessionData, sessionId, revision]);
    return {
        isSummarizing,
        triggerSummarization,
        triggerSmartContext: triggerSummarization,
        handleRegenerateSummary: regenerateSummary,
        handleRetryFailedTask: retryFailedTask,
        queueLength: summaryQueue?.length || 0,
        summaryQueue: summaryQueue || []
    };
}
