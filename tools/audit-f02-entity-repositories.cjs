// Strict extraction witness. Verify the complete transformed source against the immutable snapshot.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
function extractRepositoryOwners(source, portable = false) {
  const sessionStart = source.indexOf('  // Legacy sessions acquire an identity on first edit.');
  const restoreStart = source.indexOf('  // Read all five stores from the same database snapshot.');
  const crossStart = source.indexOf('  async function removeCharacterAndSessions(fileName)');
  const returnStart = source.indexOf('  return Object.freeze({\n    ...repositories,', crossStart);
  if (!(sessionStart > 0 && restoreStart > sessionStart && crossStart > restoreStart && returnStart > crossStart)) throw Error('Repository extraction boundaries changed');
  const sessionBlock = source.slice(sessionStart, restoreStart);
  const restoreBlock = source.slice(restoreStart, crossStart);
  const crossBlock = source.slice(crossStart, returnStart);
  const contracts = [
    ['session-operations', 'assembleSessionOperations', 'ordinaryTransaction, editor, withGeneration, bindRequestError, SESSION_GENERATION, SESSION_EDITOR', 'openSessionForEditing, saveExistingSession, cleanupSessionDiagnostics', sessionBlock, "import { sessionStateContract } from '../session-state.js';\n\n"],
    ['restore-operations', 'assembleRestoreOperations', 'database, definitions, normalizePreset, normalizePresetList, normalizeSession, withGeneration, isInternalMarker, applySessionNormalizer, bindRequestError, RESTORE_COMMIT_MARKER_ID, SESSION_GENERATION, SESSION_EDITOR', 'exportRecords, readRestoreCommitMarker, clearRestoreCommitMarker, mergeRecords, rollbackRestoredRecords', restoreBlock, "import { validateRecordBatches } from '" + (portable ? '../../../../recovered/app/persistence/backup-codec.js' : '../backup-codec.js') + "';\n\n"],
    ['cross-entity-operations', 'assembleCrossEntityOperations', 'ordinaryTransaction, normalizePreset, bindRequestError', 'removeCharacterAndSessions, renamePreset', crossBlock, ''],
  ];
  const output = {};
  for (const [file, name, inputs, outputs, block, imports] of contracts) {
    output[file + '.js'] = imports + '// Transaction bodies remain intact; the facade supplies the shared write boundary and record identity.\n' +
      'export function ' + name + '({ ' + inputs + ' }) {\n' + block +
      '  return { ' + outputs + ' };\n}\n';
  }
  let facade = source.slice(0, sessionStart) +
    contracts.map(([, name, inputs, outputs]) => '  const { ' + outputs + ' } = ' + name + '({ ' + inputs + ' });\n').join('') +
    '\n' + source.slice(returnStart);
  const backupImport = /^import \{ validateRecordBatches \} from '[^']+';\n/m;
  if (!backupImport.test(facade) || !facade.includes('normalizeLoadedSession, sessionStateContract')) throw Error('Unexpected repository imports');
  facade = facade.replace(backupImport, '').replace('normalizeLoadedSession, sessionStateContract', 'normalizeLoadedSession');
  const newImports = contracts.map(([file, name]) => "import { " + name + " } from './repositories/" + file + ".js';").join('\n');
  facade = facade.replace("import { normalizeLoadedSession } from './session-state.js';", "import { normalizeLoadedSession } from './session-state.js';\n" + newImports);
  output['entity-repositories.js'] = facade;
  return output;
}
function verifyEntityRepositoryExtraction() {
  const ref = '2abd57d73301389ba00319a8898171ab3bfe0ec8';
  const file = 'src/app/persistence/entity-repositories.js';
  const baseline = execFileSync('git', ['show', ref + ':' + file], {cwd:root, encoding:'utf8'});
  const expected = extractRepositoryOwners(baseline);
  for (const [name, content] of Object.entries(expected)) {
    const current = name === 'entity-repositories.js' ? file : 'src/app/persistence/repositories/' + name;
    assert.equal(fs.readFileSync(path.join(root,current),'utf8'), content, 'Repository extraction differs: ' + current);
  }
  console.log('F02 entity repositories: exact transaction-body extraction and explicit shared write boundary PASS');
  return { file, baseline };
}
module.exports = { verifyEntityRepositoryExtraction };
if (require.main === module) verifyEntityRepositoryExtraction();
