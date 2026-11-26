// Durable restore journal & cross-tab lock keys.
//
// HONESTY CONTRACT:
// 1. IndexedDB and Web Storage are separate persistence engines and CANNOT be committed
//    atomically across storages (atomicAcrossStorages: false).
// 2. When navigator.locks.request is available, cross-tab mutual exclusion uses an
//    exclusive non-blocking Web Lock (crossTabLockMechanism: 'web-locks', crossTabLockAtomic: true).
//    When unavailable, it falls back to a localStorage advisory lease
//    (crossTabLockMechanism: 'localStorage-advisory', crossTabLockAtomic: false) — NEVER
//    claiming localStorage is atomic. Both modes are paired with strict in-process mutual exclusion.
// 3. IndexedDB commit verification relies on a durable commit marker (with journalId,
//    ownerId, operationId) written inside the EXACT same IndexedDB transaction as restored records.
// 4. Credentials & sensitive settings are NEVER written to RESTORE_JOURNAL_KEY, inspection
//    results, error messages, or logs; they exist only inside the dedicated durable snapshotStore
//    record (containsSensitiveSettings: true) and are wiped immediately on completion or full rollback.
export const RESTORE_JOURNAL_KEY = 'stcs:backup-restore:journal:v1';
export const RESTORE_LOCK_KEY = 'stcs:backup-restore:lock:v1';

export const RECOVERY_DATABASE = Object.freeze({
  name: 'SillyTavernCardStudioRecoveryDB',
  version: 1,
  store: 'restoreSnapshots',
  keyPath: 'journalId',
});

export const RESTORE_STAGES = Object.freeze({
  VALIDATED: 'validated',
  STAGED: 'staged',
  SNAPSHOT_PERSISTED: 'snapshot-persisted',
  JOURNALED: 'journaled',
  APPLYING_IDB: 'applying-idb',
  IDB_COMMITTED: 'idb-committed',
  APPLYING_SETTINGS: 'applying-settings',
  SETTINGS_APPLIED: 'settings-applied',
  COMPLETED: 'completed',
  FAILED_IDB: 'failed-idb',
  FAILED_SETTINGS: 'failed-settings',
  RECOVERING: 'recovering',
  PARTIAL_ROLLBACK: 'partial-rollback',
  ROLLED_BACK: 'rolled-back',
});

export const PRE_IDB_STAGES = new Set([
  RESTORE_STAGES.VALIDATED,
  RESTORE_STAGES.STAGED,
  RESTORE_STAGES.SNAPSHOT_PERSISTED,
  RESTORE_STAGES.JOURNALED,
]);

export const UNRESOLVED_STAGES = new Set([
  RESTORE_STAGES.JOURNALED,
  RESTORE_STAGES.APPLYING_IDB,
  RESTORE_STAGES.IDB_COMMITTED,
  RESTORE_STAGES.APPLYING_SETTINGS,
  RESTORE_STAGES.SETTINGS_APPLIED,
  RESTORE_STAGES.FAILED_SETTINGS,
  RESTORE_STAGES.RECOVERING,
  RESTORE_STAGES.PARTIAL_ROLLBACK,
]);

export const SETTINGS_TOUCHED_STAGES = new Set([
  RESTORE_STAGES.APPLYING_SETTINGS,
  RESTORE_STAGES.SETTINGS_APPLIED,
  RESTORE_STAGES.FAILED_SETTINGS,
  RESTORE_STAGES.PARTIAL_ROLLBACK,
  RESTORE_STAGES.RECOVERING,
]);

export const STORE_CONFIG = Object.freeze([
  ['characters', 'characters', 'fileName'],
  ['presets', 'presets', 'name'],
  ['lorebooks', 'lorebooks', 'name'],
  ['personas', 'personas', 'id'],
  ['chatSessions', 'sessions', 'sessionId'],
]);

export const DEFAULT_LOCK_TTL_MS = 60_000;
let sequenceCounter = 0;

export function nextId(prefix, now) {
  sequenceCounter += 1;
  return `${prefix}-${now()}-${sequenceCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

export function resolveJournalIdArg(arg) {
  if (typeof arg === 'string') return arg;
  if (arg && typeof arg === 'object' && typeof arg.journalId === 'string') return arg.journalId;
  return undefined;
}

export function sanitizeErrorMessage(error) {
  const raw = error instanceof Error ? error.message : String(error ?? 'Unknown error');
  return raw
    .replace(/AIza[\w-]{10,}|sk-[\w-]{10,}|Bearer\s+\S+/gi, '[REDACTED]')
    .slice(0, 300);
}

export class BackupRestoreError extends Error {
  constructor(message, details = {}) {
    super(message, details.cause ? { cause: details.cause } : undefined);
    this.name = 'BackupRestoreError';
    this.code = details.code || 'BACKUP_RESTORE_FAILED';
    this.phase = details.phase || 'unknown';
    this.journalId = details.journalId || null;
    this.idbCommitted = Boolean(details.idbCommitted);
    this.settingsApplied = Boolean(details.settingsApplied);
    this.idbRolledBack = Boolean(details.idbRolledBack);
    this.settingsRolledBack = Boolean(details.settingsRolledBack);
    if (details.rollbackScope !== undefined) this.rollbackScope = details.rollbackScope;
    this.atomicAcrossStorages = false;
    this.crossTabLockMechanism = details.crossTabLockMechanism || 'localStorage-advisory';
    this.crossTabLockAtomic = Boolean(details.crossTabLockAtomic);
    this.recoverable = Boolean(details.recoverable);
  }
}

