import { postFrameMessage } from './rpc-dispatcher.js';

export function createRuntimeContextAdapters(dependencies = {}) {
  var DEFAULT_RPC_TIMEOUT_MS = 5e3;
  var normalizeImportedName = (value, fallback) => String(value ?? "").trim().slice(0,300) || fallback;
  var getCharacterSummary = fileName => {
    let state = dependencies.characterStore.getState();
    let character = state.characters.find(entry => entry.fileName === fileName);
    return character ? {fileName:character.fileName,name:character.card.name,avatar:character.avatarUrl||character.fileName,avatarUrl:character.avatarUrl,card:(0, dependencies.cloneRuntimeValue)(character.card),current:character.fileName===state.activeCharacterFileName} : null;
  };
  var findCharacter = identifier => {
    let state = dependencies.characterStore.getState(), query = String(identifier ?? ""), index = Number(query);
    return state.characters.find((character, position) => character.fileName === query || character.card.name === query || Number.isInteger(index) && index === position);
  };
  var normalizeImportedCharacter = (name, source) => {
    let rawCard = (0, dependencies.cloneRuntimeValue)(source?.raw || source?.data || source || {});
    let greetings = Array.isArray(source?.first_messages) ? source.first_messages.map(String) : [];
    return (0, dependencies.normalizeCharacterCard)({
      ...rawCard,
      name: normalizeImportedName(name ?? rawCard.name, "Imported Character"),
      description: source?.description ?? rawCard.description ?? "",
      personality: source?.personality ?? rawCard.personality ?? "",
      scenario: source?.scenario ?? rawCard.scenario ?? "",
      mes_example: source?.mes_example ?? rawCard.mes_example ?? "",
      first_mes: greetings[0] ?? rawCard.first_mes ?? "",
      alternate_greetings: greetings.length > 1 ? greetings.slice(1) : rawCard.alternate_greetings,
      creator: source?.creator ?? rawCard.creator,
      creator_notes: source?.creator_notes ?? rawCard.creator_notes ?? rawCard.creatorcomment,
      character_version: source?.version ?? rawCard.character_version,
      extensions: source?.extensions ?? rawCard.extensions
    });
  };
  var readTextPayload = async value => value instanceof Blob ? value.text() : value instanceof ArrayBuffer || ArrayBuffer.isView(value) ? (new TextDecoder).decode(value) : String(value ?? "");
  var getActiveCardFrames = () => Array.from(document.querySelectorAll('iframe[data-card-studio-iframe="true"][data-card-runtime-active="true"]'));
  var broadcastRuntimeMessage = message => { getActiveCardFrames().forEach(frame => postFrameMessage(frame, message)); };
  var emitRuntimeEvent = (targetWindow, eventName, args = []) => {
    postFrameMessage(getActiveCardFrames().find(frame => frame.contentWindow === targetWindow), {type:"CARD_RUNTIME_EVENT",eventName:eventName,args:args});
  };
  var classifyRuntimeError = message => /Unsupported card runtime method|unavailable in the isolated card runtime/i.test(message) ? "CARD_RUNTIME_RPC_UNSUPPORTED"
    : /payload exceeds|oversized/i.test(message) ? "CARD_RUNTIME_PAYLOAD_TOO_LARGE"
    : /storage|quota/i.test(message) ? "CARD_RUNTIME_STORAGE_FAILED"
    : /timeout|timed out/i.test(message) ? "CARD_RUNTIME_RPC_TIMEOUT" : "CARD_RUNTIME_RPC_FAILED";
  var buildRuntimeScope = messageId => {
    let state = dependencies.sessionStore.getState();
    return {chatId:state.sessionId||"current-chat",characterId:state.card?.fileName||state.card?.name||"current-character",presetName:state.preset?.name||"default",messageId:messageId};
  };
  var resolveGenerationPreset = options => {
    let state = dependencies.sessionStore.getState();
    if (!state.preset) throw Error("No generation preset is loaded.");
    let name = String(options.preset_name || "in_use");
    let preset = "in_use" === name ? state.preset : dependencies.presetStore.getState().presets.find(entry => entry.name === name);
    if (!preset) throw Error(`Generation preset not found: ${name}`);
    let result = (0, dependencies.cloneRuntimeValue)(preset), overrides = options.custom_api || {};
    [["max_tokens","max_tokens"],["temperature","temp"],["frequency_penalty","frequency_penalty"],["presence_penalty","presence_penalty"],["top_p","top_p"],["top_k","top_k"]].forEach(([sourceKey, targetKey]) => {
      let value = overrides[sourceKey];
      if (void 0 !== value && "same_as_preset" !== value && "unset" !== value && Number.isFinite(Number(value))) result[targetKey] = Number(value);
    });
    return result;
  };
  return { DEFAULT_RPC_TIMEOUT_MS, normalizeImportedName, getCharacterSummary, findCharacter, normalizeImportedCharacter, readTextPayload, getActiveCardFrames, broadcastRuntimeMessage, emitRuntimeEvent, classifyRuntimeError, buildRuntimeScope, resolveGenerationPreset };
}
