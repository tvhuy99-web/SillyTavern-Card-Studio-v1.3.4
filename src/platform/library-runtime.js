// First-party application contract for browser libraries. The portable and
// package-backed builds provide the same ABI below this boundary; application
// code must not access the extracted runtime's private Immer registry.
import * as runtime from '../vendor/react-state-runtime.js';
import { installImmerMapSet } from '../vendor/immer-mapset.js';
export { b as React, v as ReactDOM, wt as jsxRuntime, At as createStore, It as withImmer,
  jt as relaxedJson, l as wrapModule, o as commonJsFactory, c as unsupportedRequire } from '../vendor/react-state-runtime.js';
export { vo as GoogleGenAI, Ce as HarmBlockThreshold, ke as HarmCategory,
  De as Modality, xe as ThinkingLevel } from '../vendor/google-genai-runtime.js';
export { createLodashRuntime } from '../vendor/lodash-runtime.js';
export { createMarkdownRuntime } from '../vendor/markdown-runtime.js';
export { createHtmlSanitizerRuntime } from '../vendor/html-sanitizer-runtime.js';
export function initializeMapSet() { installImmerMapSet(runtime); }
