// Each npm package adapter replaces one emitted runtime, never the source or committed assets.
export const npmRuntimeNames = Object.freeze([
  'react-state-runtime', 'google-genai-runtime', 'lodash-runtime',
  'markdown-runtime', 'html-sanitizer-runtime', 'immer-mapset',
]);
export const npmAdapterExports = Object.freeze({
  'react-state-runtime': ['At','It','b','c','jt','l','o','v','wt','enableMapSet'],
  'google-genai-runtime': ['Ce','De','ke','vo','xe'],
  'lodash-runtime': ['createLodashRuntime'],
  'markdown-runtime': ['createMarkdownRuntime'],
  'html-sanitizer-runtime': ['createHtmlSanitizerRuntime'],
  'immer-mapset': ['installImmerMapSet'],
});
