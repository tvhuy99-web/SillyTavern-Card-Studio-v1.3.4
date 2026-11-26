// Composition Root — orchestrates ordered domain initialization and mounts the application.
import { mountApplication } from './lifecycle/mount-application.js';
import { buildCardRuntimeCoreScript as __stsBuildCardRuntimeCoreScript } from '../runtime/card-runtime/core-builder.js';
import { createStore, withImmer, React, unsupportedRequire, relaxedJson, wrapModule, commonJsFactory, ReactDOM, jsxRuntime, HarmBlockThreshold, Modality, HarmCategory, GoogleGenAI, ThinkingLevel, initializeMapSet, createLodashRuntime, createMarkdownRuntime, createHtmlSanitizerRuntime } from '../platform/library-runtime.js';
import { composePersistence, composeBackupAndGuards } from './composition/persistence-composition.js';
import { composeConnections, composeGeneration } from './composition/provider-composition.js';
import { composeStores } from './composition/store-composition.js';
import { composeConversation } from './composition/conversation-composition.js';
import { composeCardRuntime } from './composition/runtime-composition.js';
import { composeApplicationUi } from './composition/ui-composition.js';

const ctx = { GoogleGenAI, HarmBlockThreshold, HarmCategory, Modality, React, ReactDOM, ThinkingLevel, __stsBuildCardRuntimeCoreScript, commonJsFactory, createHtmlSanitizerRuntime, createLodashRuntime, createMarkdownRuntime, createStore, initializeMapSet, jsxRuntime, relaxedJson, withImmer, wrapModule };
Object.assign(ctx, composePersistence(ctx));
Object.assign(ctx, composeConnections(ctx));
Object.assign(ctx, composeBackupAndGuards(ctx));
Object.assign(ctx, composeStores(ctx));
Object.assign(ctx, composeConversation(ctx));
Object.assign(ctx, composeGeneration(ctx));
Object.assign(ctx, composeCardRuntime(ctx));
Object.assign(ctx, composeApplicationUi(ctx));

// Package build uses Immer's public API; the offline snapshot retains its original plugin.
initializeMapSet();
mountApplication({ react: React, jsxRuntime: jsxRuntime, reactDom: ReactDOM, ErrorBoundary: ctx.ErrorBoundary, InitialLoader: ctx.InitialLoader, ToastProvider: ctx.ToastProvider, SpeechProvider: ctx.SpeechProvider, CardPopupProvider: ctx.CardPopupProvider, Shell: ctx.ApplicationShell });
export{unsupportedRequire as n,commonJsFactory as t};
