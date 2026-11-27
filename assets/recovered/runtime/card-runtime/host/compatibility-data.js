export function createRuntimeCompatibilityData(dependencies = {}) {
  var applySamplingOverrides = (overrides, preset) => {
    let result = JSON.parse(JSON.stringify(preset));
    let samplingKeys = {temperature:"temp",temp:"temp",top_p:"top_p",top_k:"top_k",typical_p:"typical_p",repetition_penalty:"repetition_penalty",frequency_penalty:"frequency_penalty",presence_penalty:"presence_penalty",max_context:"truncation_length",truncation_length:"truncation_length",max_tokens:"max_tokens"};
    for (let key in samplingKeys) {
      if (overrides.hasOwnProperty(key) && void 0 !== overrides[key] && null !== overrides[key]) {
        let targetKey = samplingKeys[key];
        if (targetKey) result[targetKey] = overrides[key];
      }
    }
    return result;
  };
  var isRecordObject = value => !!value && "object" == typeof value && !Array.isArray(value);
  var cloneRuntimeValue = value => {
    if ("function" == typeof structuredClone) try { return structuredClone(value); } catch {}
    return void 0 === value ? value : JSON.parse(JSON.stringify(value));
  };
  var assertPayloadSize = (value, maxBytes = 2e6) => {
    let serialized = JSON.stringify(value ?? null);
    if ((new TextEncoder).encode(serialized).byteLength > maxBytes) throw Error(`Card runtime payload exceeds the ${maxBytes} byte limit.`);
  };
  var resolveMessageIndex = dependencies.__stsResolveRuntimeMessageIndex;
  var resolveMessageRange = (range, messageCount) => {
    if (messageCount <= 0) return [];
    if (null == range || "" === range) return Array.from({length: messageCount}, (unused, index) => index);
    if ("number" == typeof range) {
      let index = resolveMessageIndex(range, messageCount);
      return index >= 0 && index < messageCount ? [index] : [];
    }
    let expression = String(range).replace(/{{\s*lastMessageId\s*}}/gi, String(messageCount - 1)).trim();
    let match = expression.match(/^(-?\d+)\s*-\s*(-?\d+)$/);
    if (!match) {
      let index = resolveMessageIndex(Number(expression), messageCount);
      return Number.isFinite(Number(expression)) && index >= 0 && index < messageCount ? [index] : [];
    }
    let startIndex = resolveMessageIndex(Number(match[1]), messageCount), endIndex = resolveMessageIndex(Number(match[2]), messageCount);
    if (startIndex < 0 && endIndex < 0) return [];
    let lowerBound = Math.max(0, Math.min(startIndex, endIndex));
    let upperBound = Math.min(messageCount - 1, Math.max(startIndex, endIndex));
    return lowerBound > upperBound ? [] : Array.from({length: upperBound - lowerBound + 1}, (unused, index) => lowerBound + index);
  };
  var toInternalRole = role => "assistant" === role ? "model" : "user" === role ? "user" : "system";
  var toRuntimeMessage = (message, messageIndex, userName, characterName, includeSwipes = false) => {
    let role = (value => "model" === value ? "assistant" : value)(message.role);
    let rawMessage = message;
    let result = {
      message_id: messageIndex, name: rawMessage.name || ("user" === role ? userName : "assistant" === role ? characterName : "System"),
      role: role, is_hidden: !!rawMessage.is_hidden, message: String(message.content ?? ""),
      data: cloneRuntimeValue(message.contextState || {}), extra: cloneRuntimeValue(rawMessage.extra || {})
    };
    if (includeSwipes) {
      let swipes = Array.isArray(rawMessage.swipes) && rawMessage.swipes.length ? rawMessage.swipes.map(String) : [result.message];
      result.swipe_id = Math.max(0, Math.min(swipes.length - 1, Number(rawMessage.swipe_id) || 0));
      result.swipes = swipes;
      result.swipes_data = Array.isArray(rawMessage.swipes_data) ? cloneRuntimeValue(rawMessage.swipes_data) : swipes.map(() => ({}));
      result.swipes_info = Array.isArray(rawMessage.swipes_info) ? cloneRuntimeValue(rawMessage.swipes_info) : swipes.map(() => ({}));
    }
    return result;
  };
  var toRuntimeMessages = (messages, userName, characterName, includeSwipes = false) => messages.map((message, index) => toRuntimeMessage(message, index, userName, characterName, includeSwipes));
  var normalizeRuntimeScope = dependencies.__stsNormalizeRuntimeScope;
  var runtimeVariableStorageKey = dependencies.__stsRuntimeVariableStorageKey;
  var runtimeWebStorageKey = dependencies.__stsRuntimeWebStorageKey;
  var readRuntimeRecord = dependencies.__stsReadRuntimeRecord;
  var writeRuntimeRecord = (storage, key, value) => (0, dependencies.__stsWriteRuntimeRecord)(storage, key, value, assertPayloadSize);
  return { applySamplingOverrides, isRecordObject, cloneRuntimeValue, assertPayloadSize, resolveMessageIndex, resolveMessageRange, toInternalRole, toRuntimeMessage, toRuntimeMessages, normalizeRuntimeScope, runtimeVariableStorageKey, runtimeWebStorageKey, readRuntimeRecord, writeRuntimeRecord };
}
