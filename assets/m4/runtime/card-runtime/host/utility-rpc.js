import { parseImportedChat } from '../../../features/chat/chat-import.js';

export const UTILITY_RPC_METHODS = Object.freeze([
  'raw.import.character', 'raw.import.preset', 'raw.import.chat', 'slash.execute',
  'generation.models', 'preset.get', 'preset.load', 'scripts.buttons',
]);

export function createUtilityRpcHandlers({ readState, characters, presets, personas, describeCharacter,
  readText, safeName, clone, sessions, slash, loadPreset, listProxyModels, currentModel, now = Date.now,
  makeFile = (parts, name, options) => new File(parts, name, options) }) {
  return async function dispatch(method, args, lease) {
    const guard = () => lease?.assertCurrent();
    guard();
    switch (method) {
      case 'raw.import.character': {
        const content = args.content, name = safeName(args.name, 'Imported Character.json');
        const filename = /\.(?:json|json5|png|apng|charx)$/i.test(name) ? name : `${name}.json`;
        const file = content instanceof File ? content : makeFile([content instanceof Blob ? content : await readText(content)], filename,
          { type: content instanceof Blob ? content.type : 'application/json' });
        guard();
        const record = await characters().importCharacterStrict(file, guard);
        guard();
        return { ok: true, character: describeCharacter(record.fileName) };
      }
      case 'raw.import.preset': {
        const text = await readText(args.content);
        const filename = /\.json$/i.test(String(args.name || '')) ? String(args.name) : `${safeName(args.name, 'Imported Preset')}.json`;
        guard();
        const preset = await presets().importPresetStrict(makeFile([text], filename, { type: 'application/json' }), { guard });
        guard(); return { ok: true, preset: clone(preset) };
      }
      case 'raw.import.chat': {
        const state = readState();
        const identity = { characterFileName: state.card?.fileName || characters().activeCharacterFileName || '',
          presetName: state.preset?.name || presets().activePresetName || '', userPersonaId: state.persona?.id || personas().activePersonaId };
        const text = await readText(args.content);
        guard();
        const stamp = now();
        const chatHistory = parseImportedChat(text, { now: () => stamp, clone });
        const sessionId = `import-${safeName(args.name, 'chat').replace(/[^\p{L}\p{N}_-]+/gu, '-')}-${stamp}`;
        guard();

        await sessions.add({ sessionId, ...identity, chatHistory, longTermSummaries: [], variables: {}, lastUpdated: stamp,
          lastMessageSnippet: chatHistory.at(-1)?.content.slice(0, 100) || '' });
        guard(); return { ok: true, chatId: sessionId, messages: chatHistory.length };
      }
      case 'slash.execute': return await slash?.(String(args.command || '').slice(0, 200000)) ?? '';
      case 'generation.models': {
        const custom = args.custom_api || {};
        if (!custom.apiurl) return [currentModel()];
        const models = await listProxyModels(String(custom.apiurl), String(custom.key || ''), false);
        guard(); return models;
      }
      case 'preset.get': return clone(readState().preset || {});
      case 'preset.load': await loadPreset?.(String(args.name || '')); guard(); return true;
      case 'scripts.buttons': return clone(readState().scriptButtons);
      default: throw Error(`Unsupported utility RPC: ${method}`);
    }
  };
}
