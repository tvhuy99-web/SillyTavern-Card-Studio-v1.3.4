import { MAX_AVATAR_BASE64_LENGTH, assertBackupArray, isPlainObject, validateRecordBatches } from '../../../../recovered/app/persistence/backup-codec.js';
import { BackupRestoreError } from './backup-constants.js';

function normalizeLegacyNamedRecords(records, { fallbackPrefix, candidateKeys }) {
  const usedNames = new Set();
  for (const item of records) {
    if (isPlainObject(item) && typeof item.name === 'string' && item.name.trim()) {
      usedNames.add(item.name);
    }
  }
  let generatedIndex = 1;
  const pickUnique = base => {
    const clean = String(base || '').trim().slice(0, 300);
    if (clean && !usedNames.has(clean)) {
      usedNames.add(clean);
      return clean;
    }
    let candidate = clean ? `${clean} (${generatedIndex})` : `${fallbackPrefix} #${generatedIndex}`;
    while (usedNames.has(candidate)) {
      generatedIndex += 1;
      candidate = clean ? `${clean} (${generatedIndex})` : `${fallbackPrefix} #${generatedIndex}`;
    }
    generatedIndex += 1;
    usedNames.add(candidate);
    return candidate;
  };
  return records.map(item => {
    if (!isPlainObject(item)) return item;
    if (typeof item.name === 'string' && item.name.trim()) return item;
    let fallback = '';
    for (const key of candidateKeys) {
      const raw = item[key];
      if (typeof raw === 'string' && raw.trim()) {
        fallback = key === 'fileName' ? raw.trim().replace(/\.json$/i, '') : raw.trim();
        break;
      }
    }
    return { ...item, name: pickUnique(fallback) };
  });
}

export function validateBackupEnvelope(rawBackup) {
  if (!isPlainObject(rawBackup) || rawBackup.dataType !== 'full_system_backup' || !isPlainObject(rawBackup.data)) {
    throw new BackupRestoreError('File không phải là định dạng Sao lưu Hệ thống hợp lệ.', {
      code: 'INVALID_BACKUP_FORMAT',
      phase: 'validate',
    });
  }
  const data = rawBackup.data;
  const characters = assertBackupArray(data.characters, 'characters');
  const rawPresets = assertBackupArray(data.presets, 'presets');
  const rawLorebooks = assertBackupArray(data.lorebooks, 'lorebooks');
  const personas = assertBackupArray(data.personas, 'personas');
  const chatSessions = assertBackupArray(data.chatSessions, 'chatSessions');
  if (!isPlainObject(data.appSettings)) {
    throw new BackupRestoreError('Dữ liệu sao lưu không hợp lệ: appSettings phải là một đối tượng.', {
      code: 'INVALID_BACKUP_SETTINGS',
      phase: 'validate',
    });
  }

  for (const item of [...rawPresets, ...rawLorebooks, ...personas]) {
    if (!isPlainObject(item)) {
      throw new BackupRestoreError('Dữ liệu sao lưu không hợp lệ: có mục dữ liệu không phải đối tượng.', {
        code: 'INVALID_BACKUP_RECORD',
        phase: 'validate',
      });
    }
  }
  const presets = normalizeLegacyNamedRecords(rawPresets, {
    fallbackPrefix: 'Preset khôi phục',
    candidateKeys: ['presetName', 'title', 'fileName', 'id'],
  });
  const lorebooks = normalizeLegacyNamedRecords(rawLorebooks, {
    fallbackPrefix: 'Lorebook khôi phục',
    candidateKeys: ['title', 'fileName', 'id'],
  });
  for (const character of characters) {
    if (!isPlainObject(character) || !isPlainObject(character.card) || typeof character.fileName !== 'string' || !character.fileName.trim() || character.fileName.length > 500) {
      throw new BackupRestoreError('Dữ liệu sao lưu không hợp lệ: có nhân vật không hợp lệ.', {
        code: 'INVALID_CHARACTER_RECORD',
        phase: 'validate',
      });
    }
    if (character.avatarBase64 !== undefined) {
      if (typeof character.avatarBase64 !== 'string' || character.avatarBase64.length > MAX_AVATAR_BASE64_LENGTH || !/^[A-Za-z0-9+/]*={0,2}$/.test(character.avatarBase64.replace(/\s/g, ''))) {
        throw new BackupRestoreError(`Ảnh đại diện của "${character.fileName}" không hợp lệ hoặc quá lớn.`, {
          code: 'INVALID_AVATAR_BASE64',
          phase: 'validate',
        });
      }
    }
  }
  for (const session of chatSessions) {
    if (!isPlainObject(session) || typeof session.sessionId !== 'string' || !session.sessionId.trim() || session.sessionId.length > 500 || !Array.isArray(session.chatHistory)) {
      throw new BackupRestoreError('Dữ liệu sao lưu không hợp lệ: có phiên chat không hợp lệ.', {
        code: 'INVALID_SESSION_RECORD',
        phase: 'validate',
      });
    }
  }

  validateRecordBatches({ characters, presets, lorebooks, personas, chatSessions });
  return { characters, presets, lorebooks, personas, chatSessions, appSettings: data.appSettings };
}
