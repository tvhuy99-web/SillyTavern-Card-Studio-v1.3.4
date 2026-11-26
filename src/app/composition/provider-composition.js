import { createHostConnectionServices, createHostGenerationBindings } from '../../providers/common/host-provider-bindings.js';
import { createEmbeddingService as __stsCreateEmbeddingService } from '../../features/world-info/embedding-service.js';
import { createUidSafeWorldInfoResolver as __stsCreateUidSafeWorldInfoResolver, migrateSmartScanStickySettings as __stsMigrateSmartScanStickySettings, markSmartScanStickySettingsSaved as __stsMarkSmartScanStickySettingsSaved } from '../../features/world-info/sticky-compat.js';
import { createConnectionRepository } from '../../providers/common/connection-repository.js';
import { createFeatureDefaults } from '../../features/state/default-feature-settings.js';
import { createFeatureSettings } from '../../features/state/feature-settings.js';
import { createHttpTransport } from '../../providers/common/http-transport.js';
import { DEFAULT_GEMINI_MODEL, DEFAULT_GEMINI_SAFETY_SETTINGS, createGeminiClient, buildGeminiRequest } from '../../providers/gemini/config.js';

export function composeConnections(ctx) {
  const { GoogleGenAI, ThinkingLevel, __stsProxyPersistence, actionSuggestionSettingsKey, assertOrdinaryWrite, guardedLocalStorage, smartContextSettingsKey, smartScanSettingsKey, writingRefinementSettingsKey } = ctx;
  const generateOnce = (...args) => ctx.generateOnce(...args);
  var __stsHostConnections=createHostConnectionServices({proxyPersistence:__stsProxyPersistence,connections:createConnectionRepository(globalThis,{assertWriteAllowed:assertOrdinaryWrite}),settingsStorage:guardedLocalStorage,request:(...args)=>request(...args)});
  var {connections:__stsConnections,catalog:__stsCatalog}=__stsHostConnections;
  var { smartScanDefaults: smartScanDefaults, smartContextDefaults: smartContextDefaults, actionSuggestionPrompt: actionSuggestionPrompt, writingRefinementPrompt: writingRefinementPrompt, actionSuggestionDefaults: actionSuggestionDefaults, writingRefinementDefaults: writingRefinementDefaults, speechDefaults: speechDefaults } = createFeatureDefaults({});
  var getConnectionSettings=__stsConnections.getSettings;
  var saveConnectionSettings=__stsConnections.saveSettings;
  var { getSmartScanSettings: getSmartScanSettings, saveSmartScanSettings: saveSmartScanSettings, getSmartContextSettings: getSmartContextSettings, getActionSuggestionSettings: getActionSuggestionSettings, getWritingRefinementSettings: getWritingRefinementSettings } = createFeatureSettings({smartContextSettingsKey, actionSuggestionSettingsKey, smartScanSettingsKey, smartScanDefaults, smartContextDefaults, actionSuggestionDefaults, __stsMarkSmartScanStickySettingsSaved, __stsMigrateSmartScanStickySettings, writingRefinementDefaults, writingRefinementSettingsKey, storage:guardedLocalStorage});
  var getProxyProfiles=__stsHostConnections.readProfiles;
  var saveProxyProfiles=__stsHostConnections.saveProfiles;
  var getOpenRouterCachedModels=__stsCatalog.readOpenRouter;
  var saveOpenRouterModels=__stsCatalog.saveOpenRouter;
  var __stsAiStudioToolText=(...args)=>ctx.__stsHostGeneration.aiStudioToolText(...args);
  var getActiveModelDisplayName=__stsHostConnections.getDisplayModel;
  var getGeminiSettings=__stsConnections.getGemini;
  var nextGeminiKey=__stsConnections.nextGeminiKey;
  var getOpenRouterApiKey=__stsConnections.getOpenRouterKey;
  var getProxyUrl=__stsHostConnections.readProxyUrl;
  var getProxyPassword=__stsHostConnections.readProxyPassword;
  var getProxyLegacyMode=__stsHostConnections.readLegacyMode;
  var getProxyForTools=__stsHostConnections.getProxyForTools;
  var { request: request } = createHttpTransport({ getConnectionSettings: getConnectionSettings });
  var generateProxyToolText=(...args)=>ctx.__stsHostGeneration.proxyToolText(...args);
  var fetchProxyModels=__stsHostConnections.loadProxyModels;
  var createActiveGeminiClient = () => createGeminiClient({ GoogleGenAI: GoogleGenAI, getApiKey: nextGeminiKey });
  var buildActiveGeminiRequest = (prompt, preset, safetySettings) => buildGeminiRequest(prompt, preset, safetySettings, { thinkingLevel: ThinkingLevel.HIGH });
  var generateGeminiToolText = async (model, prompt, preset, safetySettings = [], signal) => ({ text: (await ctx.__stsGenerationGateway.generateOnce({ source: "gemini", model: model || preset.model || DEFAULT_GEMINI_MODEL, prompt, preset, safetySettings, signal })).response.text });
  var characterDialogueSafetySettings = DEFAULT_GEMINI_SAFETY_SETTINGS;
  var __stsEmbeddingService=__stsCreateEmbeddingService({getSettings:getSmartScanSettings,getGeminiApiKey:nextGeminiKey,hasGeminiApiKey:()=>{let settings=getGeminiSettings();return!settings.useDefault&&Array.isArray(settings.keys)&&settings.keys.some(key=>String(key).trim())},createGeminiClient:apiKey=>new GoogleGenAI({apiKey:apiKey}),addNetworkLog:entry=>ctx.sessionStore.getState().addNetworkLog(entry)});
  var loadEmbeddingIndex=(characterId,providerId)=>__stsEmbeddingService.loadIndex(characterId,providerId);
  var getEmbeddingIndex=(characterId,providerId)=>__stsEmbeddingService.getIndex(characterId,providerId);
  var embedQuery=(text,providerId)=>__stsEmbeddingService.embedQuery(text,providerId);
  var cosineSimilarity=__stsEmbeddingService.cosine;
  var hashEmbeddingText=__stsEmbeddingService.hashText;
  var getEmbeddingEntryText=__stsEmbeddingService.entryText;
  var syncLorebookEmbeddings=(characterId,entries,onProgress)=>__stsEmbeddingService.syncIndex(characterId,entries,onProgress);
  var fetchOpenRouterModels=__stsHostConnections.loadOpenRouterModels;
  return { __stsHostConnections, __stsConnections, __stsCatalog, smartScanDefaults, smartContextDefaults, actionSuggestionPrompt, writingRefinementPrompt, actionSuggestionDefaults, writingRefinementDefaults, speechDefaults, getConnectionSettings, saveConnectionSettings, getSmartScanSettings, saveSmartScanSettings, getSmartContextSettings, getActionSuggestionSettings, getWritingRefinementSettings, getProxyProfiles, saveProxyProfiles, getOpenRouterCachedModels, saveOpenRouterModels, __stsAiStudioToolText, getActiveModelDisplayName, getGeminiSettings, nextGeminiKey, getOpenRouterApiKey, getProxyUrl, getProxyPassword, getProxyLegacyMode, getProxyForTools, request, generateProxyToolText, fetchProxyModels, createActiveGeminiClient, buildActiveGeminiRequest, generateGeminiToolText, characterDialogueSafetySettings, __stsEmbeddingService, loadEmbeddingIndex, getEmbeddingIndex, embedQuery, cosineSimilarity, hashEmbeddingText, getEmbeddingEntryText, syncLorebookEmbeddings, fetchOpenRouterModels };
}

export function composeGeneration(ctx) {
  const { GoogleGenAI, __stsHostConnections, buildActiveGeminiRequest, createActiveGeminiClient, request, sessionStore } = ctx;
  var generationSafetySettings = DEFAULT_GEMINI_SAFETY_SETTINGS;
  const __stsHostGeneration=createHostGenerationBindings({connectionServices:__stsHostConnections,request:request,addNetworkLog:entry=>sessionStore.getState().addNetworkLog(entry),createGeminiClient:key=>key?new GoogleGenAI({apiKey:key}):createActiveGeminiClient(),buildGeminiRequest:buildActiveGeminiRequest,safetySettings:generationSafetySettings});
  const __stsGenerationGateway=__stsHostGeneration.gateway;
  var generateOnce=__stsHostGeneration.generateOnce;
  var streamGeneration=__stsHostGeneration.stream;
  return { generationSafetySettings, __stsHostGeneration, __stsGenerationGateway, generateOnce, streamGeneration };
}
