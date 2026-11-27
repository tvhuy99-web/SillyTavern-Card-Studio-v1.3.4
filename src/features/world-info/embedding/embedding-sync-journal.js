let nextWorldInfoSyncId = 0;

export function createWorldInfoSyncJournal(logger, providerId, options = {}) {
  const now = options.now || Date.now;
  const schedule = options.setInterval || setInterval;
  const unschedule = options.clearInterval || clearInterval;
  const startedAt = now();
  const syncId = String(++nextWorldInfoSyncId);
  const prefix = '[WI-SYNC #' + syncId + '][' + providerId + ']';
  let lastStage = 'khởi động';
  let lastCheckpointAt = startedAt;
  let lastHeartbeatAt = startedAt;
  let finished = false;

  const elapsed = () => Math.max(0, Math.round((now() - startedAt) / 1000));
  const emit = (level, message) => {
    try { logger?.(level, 'system', prefix + ' ' + String(message).slice(0, 1400)); } catch {}
  };
  const stage = (message) => {
    lastStage = String(message);
    lastCheckpointAt = now();
    emit('state', lastStage + ' (' + elapsed() + 's)');
  };
  const timer = schedule(() => {
    if (finished) return;
    const idle = Math.max(0, Math.round((now() - lastCheckpointAt) / 1000));
    if (now() - lastHeartbeatAt < 15000) return;
    lastHeartbeatAt = now();
    emit(idle >= 45 ? 'warn' : 'state',
      'Đang chạy: ' + lastStage + '; tổng ' + elapsed() + 's; không có bước mới ' + idle + 's'
      + (idle >= 45 ? '. Có thể đang chờ ONNX, bộ nhớ hoặc IndexedDB.' : '.'));
  }, 15000);
  return Object.freeze({
    stage,
    info: message => emit('state', String(message) + ' (' + elapsed() + 's)'),
    warning: message => emit('warn', String(message) + ' (' + elapsed() + 's)'),
    success: message => emit('performance', String(message) + ' (' + elapsed() + 's)'),
    fail: (step, error) => emit('error', 'THẤT BẠI tại [' + step + '] sau ' + elapsed()
      + 's: ' + (error instanceof Error ? error.message : String(error))),
    close: () => { finished = true; unschedule(timer); },
  });
}
