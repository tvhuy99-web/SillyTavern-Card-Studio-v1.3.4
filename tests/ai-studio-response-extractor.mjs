import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../android-native/AiStudioTextPlugin.java', import.meta.url), 'utf8');
const block = source.match(/INSTALL_JS = """\n([\s\S]*?)\n        """;/);
assert.ok(block, 'native AI Studio JavaScript bootstrap exists');

function evaluate(outputText, responseAvailable) {
  const node = {
    innerText: outputText, textContent: outputText,
    parentElement: {closest: () => null},
  };
  const model = {
    innerText: outputText, textContent: outputText,
    querySelectorAll(selector) {
      if (selector.includes('ms-cmark-node')) return responseAvailable ? [node] : [];
      return [];
    },
  };
  const empty = [];
  const elements = Array.from({length: 4000}, () => ({children:[]}));
  const document = {
    documentElement:{children:[]},
    querySelectorAll(selector) {
      if (selector === '*') return elements;
      if (selector === 'iframe') return empty;
      if (selector === 'ms-chat-turn') return responseAvailable ? [{}] : empty;
      if (selector === 'ms-cmark-node') return responseAvailable ? [node] : empty;
      if (selector === '.chat-turn-container.model') return responseAvailable ? [model] : empty;
      if (selector === 'ms-chat-turn .chat-turn-container.model') return responseAvailable ? [model] : empty;
      return empty;
    },
  };
  const window = {};
  vm.runInNewContext(block[1], {window,document,location:{pathname:'/prompts/example'},Date}, {timeout:5000});
  assert.equal(window.__STS_AI_TEXT_V2__.version,3);
  return window.__STS_AI_TEXT_V2__.output();
}

const found = evaluate('Xin chào, tôi là Gemini.', true);
assert.equal(found.text, 'Xin chào, tôi là Gemini.');
assert.ok(found.count >= 1);
assert.equal(found.modelTurns, 1);
assert.ok(found.method.includes('ms-chat-turn'));

const none = evaluate('',false);
assert.equal(none.text,'');
assert.equal(none.count,0);
console.log('AI Studio native response selector regression: OK');
