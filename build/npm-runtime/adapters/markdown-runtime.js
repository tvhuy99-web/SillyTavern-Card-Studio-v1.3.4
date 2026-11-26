import { marked } from 'marked';
export function createMarkdownRuntime() { return { markdown: marked, toArray: value => Array.from(value) }; }
