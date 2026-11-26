import { normalizeRuntimeScope as __stsNormalizeRuntimeScope, runtimeVariableStorageKey as __stsRuntimeVariableStorageKey, runtimeWebStorageKey as __stsRuntimeWebStorageKey, readRuntimeRecord as __stsReadRuntimeRecord, writeRuntimeRecord as writeRuntimeRecordRaw, resolveRuntimeMessageIndex as __stsResolveRuntimeMessageIndex, normalizePromptVariableScopes as __stsNormalizePromptVariableScopes, readGlobalVariables as __stsReadGlobalVariables, writeGlobalVariables as writeGlobalVariablesRaw } from "../../features/state/variable-scope-service.js";
import { createSessionWriteQueue as __stsCreateSessionWriteQueue, createSessionSaveCoordinator as __stsCreateSessionSaveCoordinator } from '../persistence/session-save-coordinator.js';
import { createEntityRepositories as __stsCreateEntityRepositories, prepareCharacterRecord as __stsPrepareCharacterRecord } from '../persistence/entity-repositories.js';
import { createCrossTabSync as __stsCreateCrossTabSync } from '../persistence/cross-tab-sync.js';
import { createBackupRestoreService as __stsCreateBackupRestoreService } from '../persistence/backup-restore-service.js';
import { createSettingsRepository as __stsCreateSettingsRepository } from '../state/settings-repository.js';
import { createAiStudioModelCatalog as createAiStudioModelCatalogRaw } from '../../providers/common/generation-gateway.js';
import { createProxyPersistence } from '../../providers/proxy/persistence.js';
import { createConnectionRepository } from '../../providers/common/connection-repository.js';
import { createGuardedStorage } from '../persistence/guarded-storage.js';
import { installAiStudioDiagnostics } from '../../diagnostics/aistudio-log.js';
import { normalizePresetConfig as __stsNormalizePresetConfig, normalizePresetList as __stsNormalizePresetList } from '../../features/presets/prompt-normalizer.js';
import { createLorebookFileCodec } from '../../features/world-info/lorebook-file.js';
import { createSettingsKeys } from '../state/settings-keys.js';
import { createBackupCodec } from '../persistence/backup-codec.js';

export function composePersistence(ctx) {
  const { relaxedJson } = ctx;
  const __stsSessionWriteQueue=__stsCreateSessionWriteQueue(record=>__stsRepositories.saveExistingSession(record));
  var { normalizeLorebook: normalizeLorebook, parseLorebookFile: parseLorebookFile } = createLorebookFileCodec({relaxedJson});
  var __stsRepositories=__stsCreateEntityRepositories({normalizePreset:__stsNormalizePresetConfig,normalizePresetList:__stsNormalizePresetList});
  var listSavedSessions=__stsRepositories.sessions.list;
  var loadSessionById=__stsRepositories.sessions.get;
  var saveSessionRecord=__stsRepositories.sessions.put;
  var deleteSessionRecord=__stsRepositories.sessions.remove;
  var prepareCharacterRecord=__stsPrepareCharacterRecord;
  var { cardRuntimeCompatibilityKey, cardRuntimeCompatibilityEvent, cardRuntimeEngineKey, cardRuntimeEngineEvent, readCardRuntimeCompatibilityMode, readCardRuntimeEngineMode, arenaSettingsKey, activePersonaIdKey, cardRuntimeStoragePrefix, geminiSettingsKey, geminiRotationKey, openRouterApiKeyStorageKey, proxyUrlKey, proxyPasswordKey, proxyLegacyModeKey, proxyForToolsKey, proxyProfilesKey, geminiModelCatalogKey, openRouterModelCatalogKey, globalConnectionKey, smartScanSettingsKey, smartContextSettingsKey, actionSuggestionSettingsKey, writingRefinementSettingsKey, speechSettingsKey, defaultGeminiModels, defaultProxyModels } = createSettingsKeys({});
  const assertOrdinaryWrite = operation => ctx.__stsBackupRestoreService.assertNotRestoring(operation);
  const guardedLocalStorage = createGuardedStorage(() => globalThis.localStorage, assertOrdinaryWrite);
  const guardedSessionStorage = createGuardedStorage(() => globalThis.sessionStorage, assertOrdinaryWrite);
  const __stsProxyPersistence = createProxyPersistence({migrateOnCreate:false, assertWriteAllowed:assertOrdinaryWrite});
  const recoveryProxy = createProxyPersistence({migrateOnCreate:false});
  const recoveryConnections = createConnectionRepository();
  const __stsWriteGlobalVariables = value => writeGlobalVariablesRaw(value, guardedLocalStorage);
  const __stsWriteRuntimeRecord = (storage,key,value,validate) => storage && writeRuntimeRecordRaw(storage === globalThis.sessionStorage ? guardedSessionStorage : guardedLocalStorage,key,value,validate);
  const __stsCreateAiStudioModelCatalog = () => createAiStudioModelCatalogRaw(globalThis,{storage:guardedLocalStorage});
  var { MAX_AVATAR_BASE64_LENGTH, isPlainObject, assertBackupArray, encodeBufferToBase64, decodeBase64ToBuffer } = createBackupCodec({});
  return { __stsSessionWriteQueue, normalizeLorebook, parseLorebookFile, __stsRepositories, listSavedSessions, loadSessionById, saveSessionRecord, deleteSessionRecord, prepareCharacterRecord, cardRuntimeCompatibilityKey, cardRuntimeCompatibilityEvent, cardRuntimeEngineKey, cardRuntimeEngineEvent, readCardRuntimeCompatibilityMode, readCardRuntimeEngineMode, arenaSettingsKey, activePersonaIdKey, cardRuntimeStoragePrefix, geminiSettingsKey, geminiRotationKey, openRouterApiKeyStorageKey, proxyUrlKey, proxyPasswordKey, proxyLegacyModeKey, proxyForToolsKey, proxyProfilesKey, geminiModelCatalogKey, openRouterModelCatalogKey, globalConnectionKey, smartScanSettingsKey, smartContextSettingsKey, actionSuggestionSettingsKey, writingRefinementSettingsKey, speechSettingsKey, defaultGeminiModels, defaultProxyModels, assertOrdinaryWrite, guardedLocalStorage, guardedSessionStorage, __stsProxyPersistence, recoveryProxy, recoveryConnections, __stsWriteGlobalVariables, __stsWriteRuntimeRecord, __stsCreateAiStudioModelCatalog, MAX_AVATAR_BASE64_LENGTH, isPlainObject, assertBackupArray, encodeBufferToBase64, decodeBase64ToBuffer };
}

export function composeBackupAndGuards(ctx) {
  const { __stsProxyPersistence, __stsRepositories, __stsSessionWriteQueue, actionSuggestionSettingsKey, activePersonaIdKey, arenaSettingsKey, cardRuntimeCompatibilityKey, cardRuntimeEngineKey, cardRuntimeStoragePrefix, geminiModelCatalogKey, geminiRotationKey, geminiSettingsKey, globalConnectionKey, guardedLocalStorage, openRouterApiKeyStorageKey, openRouterModelCatalogKey, proxyForToolsKey, proxyLegacyModeKey, proxyPasswordKey, proxyProfilesKey, proxyUrlKey, recoveryConnections, recoveryProxy, smartContextSettingsKey, smartScanSettingsKey, speechSettingsKey, writingRefinementSettingsKey } = ctx;
  var __stsCrossTabSync=__stsCreateCrossTabSync();
  var __stsSettingsRepository=__stsCreateSettingsRepository({crossTabSync:__stsCrossTabSync});
  var saveArenaSettings=settings=>{__stsSettingsRepository.setJson(arenaSettingsKey,settings)};
  var backupSettingKeys=["sillyTavernStudio_activeModel",geminiSettingsKey,geminiRotationKey,openRouterApiKeyStorageKey,proxyUrlKey,proxyPasswordKey,proxyLegacyModeKey,proxyForToolsKey,globalConnectionKey,smartScanSettingsKey,smartContextSettingsKey,actionSuggestionSettingsKey,writingRefinementSettingsKey,speechSettingsKey,proxyProfilesKey,geminiModelCatalogKey,openRouterModelCatalogKey,arenaSettingsKey,activePersonaIdKey,cardRuntimeCompatibilityKey,cardRuntimeEngineKey,"sillyTavernStudio_proxyRememberSecrets","sts_aistudio_show_page","sts_ai_studio_model_list"];
  var backupSettingKeySet=new Set(backupSettingKeys);
  var __stsBackupKeys={gemini:geminiSettingsKey,rotation:geminiRotationKey,openrouter:openRouterApiKeyStorageKey,profiles:proxyProfilesKey,password:proxyPasswordKey};
  var __stsBackupStorage={get local(){return globalThis.localStorage},get session(){return globalThis.sessionStorage},connections:recoveryConnections,proxy:recoveryProxy,keys:__stsBackupKeys};
  var __stsBackupRestoreService=__stsCreateBackupRestoreService({repositories:__stsRepositories,storage:__stsBackupStorage,backupOptions:{allowed:backupSettingKeySet,prefix:cardRuntimeStoragePrefix,keys:__stsBackupKeys,proxy:__stsProxyPersistence},crossTabSync:__stsCrossTabSync});
  ctx.__stsBackupRestoreService = __stsBackupRestoreService;
  __stsRepositories.setWriteGuard?.(operation=>__stsBackupRestoreService.assertNotRestoring(operation));
  __stsRepositories.setWriteCoordinator(__stsBackupRestoreService.runOrdinaryWrite);
  __stsSessionWriteQueue.setWriteGuard?.({assertWriteAllowed:operation=>__stsBackupRestoreService.assertNotRestoring(operation),getRestoreEpoch:()=>__stsBackupRestoreService.getRestoreEpoch(),subscribeRestoreLifecycle:listener=>__stsBackupRestoreService.subscribeRestoreLifecycle(listener)});
  __stsSettingsRepository.setWriteGuard?.(operation=>__stsBackupRestoreService.assertNotRestoring(operation));
  if (!__stsBackupRestoreService.isRestoreInProgress()) {
    try { __stsProxyPersistence.migrateLegacyState(); } catch { console.warn('[Proxy] Legacy storage migration could not be completed.'); }
  }
  installAiStudioDiagnostics({settingsStorage:guardedLocalStorage});
  return { __stsCrossTabSync, __stsSettingsRepository, saveArenaSettings, backupSettingKeys, backupSettingKeySet, __stsBackupKeys, __stsBackupStorage, __stsBackupRestoreService };
}
