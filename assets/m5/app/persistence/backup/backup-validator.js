import { MAX_AVATAR_BASE64_LENGTH, assertBackupArray, isPlainObject, validateRecordBatches } from '../../../../recovered/app/persistence/backup-codec.js';
import { BackupRestoreError } from './backup-constants.js';

export function validateBackupEnvelope(rawBackup) {
  if (!isPlainObject(rawBackup) || rawBackup.dataType !== 'full_system_backup' || !isPlainObject(rawBackup.data)) {
    throw new BackupRestoreError('File không phải là định dạng Sao lưu Hệ thống hợp lệ.', {
      code: 'INVALID_BACKUP_FORMAT',
      phase: 'validate',
    });
  }
  const data = rawBackup.data;
  const characters = assertBackupArray(data.characters, 'characters');
  const presets = assertBackupArray(data.presets, 'presets');
  const lorebooks = assertBackupArray(data.lorebooks, 'lorebooks');
  const personas = assertBackupArray(data.personas, 'personas');
  const chatSessions = assertBackupArray(data.chatSessions, 'chatSessions');
  if (!isPlainObject(data.appSettings)) {
    throw new BackupRestoreError('Dữ liệu sao lưu không hợp lệ: appSettings phải là một đối tượng.', {
      code: 'INVALID_BACKUP_SETTINGS',
      phase: 'validate',
    });
  }

  for (const item of [...presets, ...lorebooks, ...personas]) {
    if (!isPlainObject(item)) {
      throw new BackupRestoreError('Dữ liệu sao lưu không hợp lệ: có mục dữ liệu không phải đối tượng.', {
        code: 'INVALID_BACKUP_RECORD',
        phase: 'validate',
      });
    }
  }
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

