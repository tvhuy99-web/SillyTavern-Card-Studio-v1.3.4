/* GENERATED FILE. DO NOT EDIT DIRECTLY.
   Source: src/app/host.js
   Build pipeline: build/build-production-bundle.mjs
   Module path relocation only. Historical transforms are not executed.
*/
// Composition Root — orchestrates ordered domain initialization and mounts the application.
import { mountApplication } from './recovered/app/lifecycle/mount-application.js';
import { buildCardRuntimeCoreScript as __stsBuildCardRuntimeCoreScript } from './card-runtime-core-builder-v1.3.6.js';
import { createStore, withImmer, React, unsupportedRequire, relaxedJson, wrapModule, commonJsFactory, ReactDOM, jsxRuntime, HarmBlockThreshold, Modality, HarmCategory, GoogleGenAI, ThinkingLevel, initializeMapSet, createLodashRuntime, createMarkdownRuntime, createHtmlSanitizerRuntime } from './recovered/platform/library-runtime.js';
import { composePersistence, composeBackupAndGuards } from './recovered/app/composition/persistence-composition.js';
import { composeConnections, composeGeneration } from './recovered/app/composition/provider-composition.js';
import { composeStores } from './recovered/app/composition/store-composition.js';
import { composeConversation } from './recovered/app/composition/conversation-composition.js';
import { composeCardRuntime } from './recovered/app/composition/runtime-composition.js';
import { composeApplicationUi } from './recovered/app/composition/ui-composition.js';

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
