// Recovered from the application host. One owner; dependency getters preserve late binding.
export function createCharacterExport(dependencies = {}) {
  var PNG_SIGNATURE = [137,80,78,71,13,10,26,10];
  var isRecordObject = value => "object" == typeof value && !!value && !Array.isArray(value);
  var crc32LookupTable = (() => {
    let table = [];
    for (let byte = 0; byte < 256; byte++) {
      let crc = byte;
      for (let bit = 0; bit < 8; bit++) crc = 1 & crc ? 3988292384 ^ crc >>> 1 : crc >>> 1;
      table.push(crc >>> 0);
    }
    return table;
  })();
  var encodeBase64Utf8 = text => {
    let bytes = (new TextEncoder).encode(text);
    if (bytes.byteLength > 50331648) throw Error("Dữ liệu thẻ quá lớn để ghi vào PNG.");
    let binary = "";
    for (let index = 0; index < bytes.length; index += 32768) binary += String.fromCharCode(...bytes.subarray(index,index+32768));
    return btoa(binary);
  };
  var createPngTextChunk = (keyword, text) => {
    let encoder = new TextEncoder;
    let chunkType = encoder.encode("tEXt"), keywordBytes = encoder.encode(keyword), textBytes = encoder.encode(text);
    let data = new Uint8Array(keywordBytes.length + 1 + textBytes.length);
    data.set(keywordBytes);
    data.set(textBytes, keywordBytes.length + 1);
    let crcInput = new Uint8Array(chunkType.length + data.length);
    crcInput.set(chunkType);
    crcInput.set(data, chunkType.length);
    let chunk = new Uint8Array(12 + data.length), view = new DataView(chunk.buffer);
    view.setUint32(0, data.length);
    chunk.set(chunkType, 4);
    chunk.set(data, 8);
    view.setUint32(8 + data.length, (bytes => {
      let crc = -1;
      for (let byte of bytes) crc = crc >>> 8 ^ crc32LookupTable[255 & (crc ^ byte)];
      return (-1 ^ crc) >>> 0;
    })(crcInput));
    return chunk;
  };
  var cleanExportValue = (value, key = "") => {
    if (key.startsWith("__") || "attached_lorebooks" === key || "source_lorebook" === key) return;
    if (Array.isArray(value)) return value.map(item => cleanExportValue(item)).filter(item => void 0 !== item);
    if (!isRecordObject(value)) return value;
    let result = {};
    for (let [field, fieldValue] of Object.entries(value)) {
      let cleanedValue = cleanExportValue(fieldValue, field);
      if (void 0 !== cleanedValue) result[field] = cleanedValue;
    }
    return result;
  };
  var convertLegacyScript = entry => {
    let {buttons, ...script} = cleanExportValue(entry.value);
    return {...script, type:"script", button:isRecordObject(script.button)
      ? {...script.button,buttons:Array.isArray(buttons)?buttons:script.button.buttons||[]}
      : {buttons:Array.isArray(buttons)?buttons:[]}};
  };
  var resolveExportSpec = (card, requestedSpec) => {
    if ("auto" !== requestedSpec) return requestedSpec;
    let spec = String(card.__source_spec || card.spec || "").toLowerCase();
    return spec.includes("v3") ? "v3" : spec.includes("v2") ? "v2" : "v1";
  };
  var buildExportData = (card, spec) => {
    let data = cleanExportValue(card);
    delete data.data;
    delete data.spec;
    delete data.spec_version;
    delete data.char_name;
    delete data.char_greeting;
    delete data.example_dialogue;
    delete data.world_scenario;
    if (data.char_book) {
      data.character_book = data.char_book;
      delete data.char_book;
    }
    data.extensions = (value => {
      let extensions = isRecordObject(value) ? cleanExportValue(value) : {};
      let scripts = Array.isArray(extensions.TavernHelper_scripts)
        ? extensions.TavernHelper_scripts.filter(entry => "script" === entry?.type && isRecordObject(entry.value)) : [];
      if (!scripts.length) return extensions;
      let helper = Array.isArray(extensions.tavern_helper) ? extensions.tavern_helper.map(entry => cleanExportValue(entry)) : [];
      let scriptGroup = helper.find(entry => Array.isArray(entry) && "scripts" === entry[0]);
      if (!scriptGroup) {
        scriptGroup = ["scripts",[]];
        helper.push(scriptGroup);
      }
      if (!Array.isArray(scriptGroup[1])) scriptGroup[1] = [];
      let scriptsById = new Map;
      scriptGroup[1].forEach((script, index) => {
        if (isRecordObject(script)) scriptsById.set(String(script.id || `legacy_${index}`), script);
      });
      scripts.forEach((entry, index) => {
        let scriptId = String(entry.value.id || `script_${index}`);
        scriptsById.set(scriptId, {...scriptsById.get(scriptId)||{}, ...convertLegacyScript(entry), id:scriptId});
      });
      scriptGroup[1] = [...scriptsById.values()];
      extensions.tavern_helper = helper;
      return extensions;
    })(data.extensions);
    ["name","description","personality","scenario","first_mes","mes_example","creator_notes","system_prompt","post_history_instructions","creator","character_version"].forEach(field => {
      data[field] = void 0 === data[field] || null === data[field] ? "" : String(data[field]);
    });
    data.alternate_greetings = Array.isArray(data.alternate_greetings) ? data.alternate_greetings.map(String) : [];
    data.tags = Array.isArray(data.tags) ? data.tags.map(String) : [];
    if ("v3" === spec) {
      data.group_only_greetings = Array.isArray(data.group_only_greetings) ? data.group_only_greetings.map(String) : [];
      data.modification_date = Math.floor(Date.now()/1e3);
    }
    return data;
  };
  var buildExportCard = (card, requestedSpec = "auto") => {
    let spec = resolveExportSpec(card, requestedSpec);
    if ("v1" === spec) {
      let data = buildExportData(card,"v2"), result = {...data};
      result.char_name = data.name;
      result.char_persona = data.personality;
      result.char_greeting = data.first_mes;
      result.example_dialogue = data.mes_example;
      result.world_scenario = data.scenario;
      delete result.character_book;
      if (data.character_book) result.char_book = data.character_book;
      return result;
    }
    let data = buildExportData(card,spec);
    let sourceSpec = String(card.spec || card.__source_spec || "").toLowerCase();
    let sourceVersion = void 0 === card.spec_version || null === card.spec_version ? "" : String(card.spec_version);
    let result = {spec:"v3"===spec?"chara_card_v3":"chara_card_v2",spec_version:"v3"===spec?sourceSpec.includes("v3")&&sourceVersion?sourceVersion:"3.0":sourceSpec.includes("v2")&&sourceVersion?sourceVersion:"2.0"};
    ((target, source) => {
      ["name","description","personality","scenario","first_mes","mes_example","creatorcomment","avatar","chat","talkativeness","fav","tags"].forEach(field => {
        if (void 0 !== source[field]) target[field] = source[field];
      });
    })(result,data);
    result.data = data;
    return result;
  };
  var isPngBytes = bytes => bytes.length >= PNG_SIGNATURE.length && PNG_SIGNATURE.every((signatureByte,index) => bytes[index] === signatureByte);
  var downloadBlob = (blob, fileName) => {
    let url = URL.createObjectURL(blob), anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3e4);
  };
  return { encodeBase64Utf8, createPngTextChunk, resolveExportSpec, buildExportCard, isPngBytes, downloadBlob };
}
