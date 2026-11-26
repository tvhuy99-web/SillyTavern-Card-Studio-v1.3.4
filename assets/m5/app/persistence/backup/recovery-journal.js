import { isPlainObject } from '../../../../recovered/app/persistence/backup-codec.js';
import {
  PRE_IDB_STAGES,
  UNRESOLVED_STAGES,
  SETTINGS_TOUCHED_STAGES,
  RESTORE_STAGES,
  BackupRestoreError,
  resolveJournalIdArg,
} from './backup-constants.js';

export function isUnresolvedJournal(journal) {
  return Boolean(journal && UNRESOLVED_STAGES.has(journal.status));
}

export function computeAvailableActions({ journal, commitState, idbCommitted, hasSettingsEntries, hasDurableSnapshot }) {
  if (!journal) {
    return { canRetrySettings: false, canRollbackIdb: false, canDismiss: false };
  }
  if (journal.status === RESTORE_STAGES.PARTIAL_ROLLBACK) {
    const canRollbackIdb = Boolean(hasDurableSnapshot);
    return {
      canRetrySettings: false,
      canRollbackIdb,
      canDismiss: !canRollbackIdb,
    };
  }
  if (commitState === 'verified-committed' && idbCommitted) {
    const canRetrySettings = Boolean(hasSettingsEntries) && journal.status !== RESTORE_STAGES.SETTINGS_APPLIED;
    const canRollbackIdb = Boolean(hasDurableSnapshot);
    const canDismiss = !canRetrySettings && !canRollbackIdb;
    return { canRetrySettings, canRollbackIdb, canDismiss };
  }
  if (commitState === 'pre-idb') {
    return {
      canRetrySettings: false,
      canRollbackIdb: false,
      canDismiss: true,
    };
  }
  // commitState === 'unverified-or-aborted'
  const canRollbackIdb = Boolean(hasDurableSnapshot);
  return {
    canRetrySettings: false,
    canRollbackIdb,
    canDismiss: !canRollbackIdb,
  };
}


export function createRecoveryJournalManager({ journalStorage, journalKey, lockMeta, crossTabLockMechanism, crossTabLockAtomic, now, sanitizeErrorMessage }) {
  function readJournal() {
    if (!journalStorage || typeof journalStorage.getItem !== 'function') return null;
    try {
      const raw = journalStorage.getItem(journalKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return isPlainObject(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  // Persist non-sensitive journal metadata ONLY — never write plaintext credentials or secrets here,
  // and never silently swallow journal write errors.
  function writeJournal(entry, { allowCompactFallback = false } = {}) {
    if (!journalStorage || typeof journalStorage.setItem !== 'function') {
      throw new BackupRestoreError('Kho lưu nhật ký khôi phục Web Storage không khả dụng.', {
        code: 'JOURNAL_WRITE_FAILED',
        phase: 'journal',
        journalId: entry?.id || null,
        idbCommitted: Boolean(entry?.idbCommitted),
        settingsApplied: Boolean(entry?.settingsApplied),
        recoverable: Boolean(entry?.idbCommitted),
        ...lockMeta,
      });
    }
    // Strip any sensitive settings payload if accidentally passed on entry.
    const {
      settingsEntries: _omitIncoming,
      previousSettings: _omitPrevious,
      ...safeEntry
    } = entry || {};
    const fullRecord = {
      ...safeEntry,
      atomicAcrossStorages: false,
      crossTabLockMechanism,
      crossTabLockAtomic,
      updatedAt: now(),
    };
    try {
      journalStorage.setItem(journalKey, JSON.stringify(fullRecord));
      return fullRecord;
    } catch (firstError) {
      if (!allowCompactFallback) {
        throw new BackupRestoreError('Không thể ghi nhật ký khôi phục vào Web Storage.', {
          code: 'JOURNAL_WRITE_FAILED',
          phase: 'journal',
          journalId: fullRecord.id || null,
          idbCommitted: Boolean(fullRecord.idbCommitted),
          settingsApplied: Boolean(fullRecord.settingsApplied),
          recoverable: Boolean(fullRecord.idbCommitted),
          cause: firstError,
          ...lockMeta,
        });
      }
      const compactRecord = {
        id: fullRecord.id,
        status: fullRecord.status,
        createdAt: fullRecord.createdAt,
        updatedAt: fullRecord.updatedAt,
        idbCommitted: Boolean(fullRecord.idbCommitted),
        settingsApplied: Boolean(fullRecord.settingsApplied),
        idbRolledBack: Boolean(fullRecord.idbRolledBack),
        settingsRolledBack: Boolean(fullRecord.settingsRolledBack),
        snapshotPersisted: Boolean(fullRecord.snapshotPersisted),
        hasSettingsEntries: Boolean(fullRecord.hasSettingsEntries),
        containsSensitiveSettings: Boolean(fullRecord.containsSensitiveSettings),
        errorName: fullRecord.errorName || null,
        errorMessage: fullRecord.errorMessage ? sanitizeErrorMessage(fullRecord.errorMessage) : null,
        compact: true,
        atomicAcrossStorages: false,
        crossTabLockMechanism,
        crossTabLockAtomic,
      };
      try {
        journalStorage.setItem(journalKey, JSON.stringify(compactRecord));
        return compactRecord;
      } catch (compactError) {
        throw new BackupRestoreError('Không thể ghi cả nhật ký khôi phục rút gọn vào Web Storage.', {
          code: 'JOURNAL_WRITE_FAILED',
          phase: 'journal',
          journalId: fullRecord.id || null,
          idbCommitted: Boolean(fullRecord.idbCommitted),
          settingsApplied: Boolean(fullRecord.settingsApplied),
          recoverable: Boolean(fullRecord.idbCommitted),
          cause: compactError,
          ...lockMeta,
        });
      }
    }
  }

  function clearJournal() {
    if (!journalStorage || typeof journalStorage.removeItem !== 'function') return;
    journalStorage.removeItem(journalKey);
  }


  function sanitizeJournalForInspection(journal) {
    const {
      settingsEntries: _omitIncoming,
      previousSettings: _omitPrevious,
      ...safe
    } = journal;
    return safe;
  }

  function getPendingRecovery() {
    const journal = readJournal();
    if (!isUnresolvedJournal(journal)) return null;
    const commitState = journal.status === RESTORE_STAGES.PARTIAL_ROLLBACK && journal.idbRolledBack
      ? 'idb-rolled-back'
      : PRE_IDB_STAGES.has(journal.status)
        ? 'pre-idb'
        : journal.idbCommitted
          ? 'verified-committed'
          : 'unverified-or-aborted';
    const hasSettingsEntries = Boolean(journal.hasSettingsEntries || Array.isArray(journal.settingsEntries) || journal.snapshotPersisted);
    const hasDurableSnapshot = Boolean(journal.snapshotPersisted);
    const availableActions = computeAvailableActions({
      journal,
      commitState,
      idbCommitted: Boolean(journal.idbCommitted),
      hasSettingsEntries,
      hasDurableSnapshot,
    });
    return {
      ...sanitizeJournalForInspection(journal),
      commitState,
      hasSettingsEntries,
      availableActions,
      atomicAcrossStorages: false,
      ...lockMeta,
    };
  }


  function requireActiveRecoveryJournal(requestedJournalId) {
    const journal = readJournal();
    if (!journal) {
      throw new BackupRestoreError('Không tìm thấy nhật ký khôi phục đang chờ xử lý.', {
        code: 'NO_PENDING_JOURNAL',
        phase: 'recovery',
        journalId: requestedJournalId || null,
        ...lockMeta,
      });
    }
    if (!isUnresolvedJournal(journal)) {
      throw new BackupRestoreError(`Nhật ký khôi phục "${journal.id}" đã ở trạng thái kết thúc ("${journal.status}").`, {
        code: 'STALE_RECOVERY_JOURNAL',
        phase: 'recovery',
        journalId: journal.id,
        ...lockMeta,
      });
    }
    if (requestedJournalId && journal.id !== requestedJournalId) {
      throw new BackupRestoreError(`Nhật ký khôi phục "${requestedJournalId}" không khớp với phiên hiện tại ("${journal.id}").`, {
        code: 'JOURNAL_ID_MISMATCH',
        phase: 'recovery',
        journalId: requestedJournalId,
        ...lockMeta,
      });
    }
    return journal;
  }

  // Recovery path A: Retry applying Web Storage settings — ONLY if active pending journal & IDB commit verified!

  return { readJournal, writeJournal, clearJournal, sanitizeJournalForInspection, getPendingRecovery, requireActiveRecoveryJournal };
}
