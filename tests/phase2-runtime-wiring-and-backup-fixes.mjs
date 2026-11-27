import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateBackupEnvelope } from '../src/app/persistence/backup/backup-validator.js';
import { streamBlobToAndroid } from '../src/diagnostics/android-export-download.js';

{
  const messageViewSrc = fs.readFileSync(new URL('../src/app/composition/ui/message-view.js', import.meta.url), 'utf8');
  assert.match(messageViewSrc, /formatCardChatHistory:\s*toRuntimeMessages/);
  assert.match(messageViewSrc, /buildVariableScopes:\s*buildVariableScopes/);
  assert.match(messageViewSrc, /getCompatibilityMode:\s*readCardRuntimeCompatibilityMode/);
  assert.match(messageViewSrc, /getRuntimeEngineMode:\s*readCardRuntimeEngineMode/);
  assert.match(messageViewSrc, /replaceFrameTemplates:\s*replaceFrameTemplates/);
  assert.match(messageViewSrc, /serializeElementAttributes:\s*serializeElementAttributes/);
  assert.match(messageViewSrc, /escapeHtmlAttribute:\s*escapeHtmlAttribute/);
  assert.match(messageViewSrc, /readScopedFrameStorage:\s*readScopedFrameStorage/);
  assert.match(messageViewSrc, /serializeInlineJson:\s*serializeInlineJson/);
  assert.match(messageViewSrc, /buildFrameSmartStateBlock:\s*buildFrameSmartStateBlock/);
  assert.match(messageViewSrc, /legacyFrameImportMap:\s*baseFrameImportMap/);
  assert.match(messageViewSrc, /officialFrameImportMap:\s*updatedFrameImportMap/);
  assert.match(messageViewSrc, /legacyFrameLibrariesHtml:\s*baseFrameLibrariesHtml/);
  assert.match(messageViewSrc, /officialFrameLibrariesHtml:\s*updatedFrameLibrariesHtml/);
  assert.doesNotMatch(messageViewSrc, /buildVariableScopes:\s*toRuntimeMessages/);
  assert.doesNotMatch(messageViewSrc, /getCompatibilityMode:\s*readCardRuntimeEngineMode/);

  const sessionNavSrc = fs.readFileSync(new URL('../src/app/composition/ui/session-navigation.js', import.meta.url), 'utf8');
  assert.match(sessionNavSrc, /expandRandomMacros:\s*expandRandomMacros/);
  assert.match(sessionNavSrc, /extractRegexScripts:\s*extractRegexScripts/);
  assert.match(sessionNavSrc, /resolveCharacterName:\s*resolveCharacterName/);
}

{
  const legacyBackup = {
    version: 1,
    dataType: 'full_system_backup',
    data: {
      characters: [],
      presets: [
        { name: 'Mặc định', prompts: [] },
        { name: '', title: 'Legacy Title Preset', prompts: [] },
        { fileName: 'my-old-preset.json', prompts: [] },
        { name: '   ', prompts: [] },
      ],
      lorebooks: [
        { name: '', title: 'Old Worldbook', entries: [] },
      ],
      personas: [],
      chatSessions: [],
      appSettings: {},
    },
  };
  const validated = validateBackupEnvelope(legacyBackup);
  assert.deepEqual(
    validated.presets.map(p => p.name),
    ['Mặc định', 'Legacy Title Preset', 'my-old-preset', 'Preset khôi phục #1'],
  );
  assert.deepEqual(validated.lorebooks.map(l => l.name), ['Old Worldbook']);

  assert.throws(() => validateBackupEnvelope({
    version: 1,
    dataType: 'full_system_backup',
    data: {
      characters: [],
      presets: [{ name: 'Dup' }, { name: 'Dup' }],
      lorebooks: [],
      personas: [],
      chatSessions: [],
      appSettings: {},
    },
  }), /khóa trùng lặp: presets\.name/);
}

{
  const payload = new Uint8Array(600 * 1024);
  for (let i = 0; i < payload.length; i += 1) payload[i] = i % 251;
  const blob = new Blob([payload], { type: 'application/json' });
  const chunks = [];
  const progressEvents = [];
  const plugin = {
    async beginSave({ fileName, mimeType }) {
      assert.equal(fileName, 'FullBackup_20261127.json');
      assert.equal(mimeType, 'application/json');
      return { exportId: 'exp-1', destination: 'content://test/backup.json' };
    },
    async appendChunk({ exportId, base64 }) {
      assert.equal(exportId, 'exp-1');
      chunks.push(Buffer.from(base64, 'base64'));
      return { writtenBytes: chunks.reduce((s, b) => s + b.length, 0) };
    },
    async finishSave({ exportId, expectedBytes }) {
      assert.equal(exportId, 'exp-1');
      const total = chunks.reduce((s, b) => s + b.length, 0);
      assert.equal(expectedBytes, total);
      return { bytes: total, destination: 'content://test/backup.json' };
    },
    async abortSave() {},
  };

  const result = await streamBlobToAndroid({
    blob,
    filename: 'FullBackup_20261127.json',
    plugin,
    onProgress: (written, total) => progressEvents.push([written, total]),
  });
  assert.equal(result.bytes, payload.length);
  assert.ok(progressEvents.length >= 2);
  assert.deepEqual(progressEvents[progressEvents.length - 1], [payload.length, payload.length]);
  const reassembled = Buffer.concat(chunks);
  assert.equal(Buffer.compare(reassembled, Buffer.from(payload)), 0);
}

console.log('Phase 2 runtime wiring, legacy backup presets.name, and Android blob export regression PASS');
