import createDOMPurify from 'dompurify';
export function createHtmlSanitizerRuntime() { return { sanitizer: createDOMPurify(window) }; }
