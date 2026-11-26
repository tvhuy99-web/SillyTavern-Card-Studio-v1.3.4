import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const TARGET_FILES = [
  'src/diagnostics/ui/diagnostic-panels.js',
  'src/features/catalog/ui/character-sections.js',
  'src/features/chat/ui/message-rendering.js',
  'src/features/chat/ui/session-screens.js',
  'src/features/rpg/ui/rpg-screens.js',
  'src/ui/settings/settings-screens.js',
  'src/features/prompts/prompt-assembler.js',
  'src/features/prompts/story-content.js',
  'src/providers/common/http-transport.js',
  'src/providers/gemini/config.js',
  'src/diagnostics/network-redaction.js',
];

const MAX_CODE_LINE_LENGTH = 500;

function stripCommentsAndStrings(code) {
  let out = '';
  let i = 0;
  while (i < code.length) {
    const ch = code[i];
    const next = code[i + 1];
    if (ch === '/' && next === '/') {
      while (i < code.length && code[i] !== '\n') i++;
      continue;
    }
    if (ch === '/' && next === '*') {
      i += 2;
      while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) {
        if (code[i] === '\n') out += '\n';
        i++;
      }
      i += 2;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      const quote = ch;
      out += quote;
      i++;
      while (i < code.length && code[i] !== quote) {
        if (code[i] === '\\' && i + 1 < code.length) {
          i += 2;
          continue;
        }
        if (code[i] === '\n') out += '\n';
        i++;
      }
      out += quote;
      i++;
      continue;
    }
    out += ch;
    i++;
  }
  return out;
}

function isDataStringOrCommentLine(line) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
    return true;
  }
  // Remove string/template literal payloads to measure actual code length on the line.
  const stripped = stripCommentsAndStrings(trimmed);
  return stripped.length <= MAX_CODE_LINE_LENGTH;
}

for (const relPath of TARGET_FILES) {
  const absPath = fileURLToPath(new URL('../' + relPath, import.meta.url));
  assert.ok(fs.existsSync(absPath), `Missing file: ${relPath}`);

  // 1. Valid JS syntax via `node --check`.
  execFileSync(process.execPath, ['--check', absPath], { stdio: 'pipe' });

  const content = fs.readFileSync(absPath, 'utf8');
  const lines = content.split('\n');
  assert.ok(lines.length > 20, `${relPath} must be multi-line readable`);

  // 2. No code line exceeds 500 characters (excluding embedded data strings/comments).
  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    if (line.length > MAX_CODE_LINE_LENGTH && !isDataStringOrCommentLine(line)) {
      assert.fail(`${relPath}:${idx + 1} code line too long (${line.length} chars > ${MAX_CODE_LINE_LENGTH})`);
    }
  }

  // 3. No minified `!0`, `!1`, or `void 0` in code.
  const codeOnly = stripCommentsAndStrings(content);
  const minifiedMatch = codeOnly.match(/(?:^|[^A-Za-z0-9_$])(!0|!1|void\s+0)(?![A-Za-z0-9_$])/);
  assert.equal(
    minifiedMatch,
    null,
    `${relPath} must not contain minified idioms (!0, !1, void 0); found: ${minifiedMatch?.[1]}`,
  );
}

console.log(`Phase 1 E02 readability checks (${TARGET_FILES.length} files): OK`);
