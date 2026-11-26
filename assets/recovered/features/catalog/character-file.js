// Recovered from the application host. One owner; dependency getters preserve late binding.
export function createCharacterFileCodec(dependencies = {}) {
  var MAX_CARD_METADATA_BYTES = 50331648;
  var MAX_EMBEDDED_ASSET_BYTES = 67108864;
  var PNG_SIGNATURE = [137,80,78,71,13,10,26,10];
  var isRecordObject = value => "object" == typeof value && !!value && !Array.isArray(value);
  var isPngBytes = bytes => bytes.length >= PNG_SIGNATURE.length && PNG_SIGNATURE.every((signatureByte,index) => bytes[index] === signatureByte);
  var parseCardJson = (text, fileName) => {
    try { return dependencies.jt.default.parse(text.replace(/^\uFEFF/,"")); }
    catch (error) { throw Error(`Dữ liệu nhân vật trong "${fileName}" không phải JSON hợp lệ.`,{cause:error}); }
  };
  var decodePngBase64Metadata = encoded => {
    let base64 = encoded.replace(/\s+/g,"");
    if (!base64 || base64.length > Math.ceil(4*MAX_CARD_METADATA_BYTES/3)+4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) throw Error("Metadata thẻ trong PNG có dữ liệu base64 không hợp lệ hoặc quá lớn.");
    try {
      let binary = atob(base64);
      if (binary.length > MAX_CARD_METADATA_BYTES) throw Error("Metadata quá lớn.");
      let bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
      return new TextDecoder("utf-8",{fatal:true}).decode(bytes);
    } catch (error) { throw Error("Không thể giải mã metadata UTF-8/base64 trong tệp PNG.",{cause:error}); }
  };
  var yieldToEventLoop = () => new Promise(resolve => setTimeout(resolve,0));
  var copyLegacyField = (card, legacyKey, targetKey) => {
    if ((void 0 === card[targetKey] || null === card[targetKey] || "" === card[targetKey]) && void 0 !== card[legacyKey] && null !== card[legacyKey]) card[targetKey] = card[legacyKey];
  };
  var toText = value => null == value ? "" : String(value);
  var toTextArray = value => Array.isArray(value) ? value.map(item => String(item)) : null == value || "" === value ? [] : [String(value)];
  var mergeCardObjects = (target, source) => {
    Object.entries(source).forEach(([key,value]) => {
      if (isRecordObject(value) && isRecordObject(target[key])) target[key] = mergeCardObjects({...target[key]},value);
      else target[key] = value;
    });
    return target;
  };
  var normalizeCharacterCard = (source, fallbackName = "") => {
    if (!isRecordObject(source)) throw Error("Thẻ nhân vật phải là một đối tượng JSON.");
    let hasData = isRecordObject(source.data);
    let sourceSpec = "string" == typeof source.spec ? source.spec : hasData ? "chara_card_v2" : "chara_card_v1";
    let card = (value => {
      let flattened = {...value};
      for (let depth=0; depth<4; depth++) {
        let nested = flattened.data;
        if (!isRecordObject(nested) || !["name","description","first_mes","mes_example","character_book","extensions"].some(key => key in nested)) break;
        let {data: nestedData, ...outer} = flattened;
        flattened = {...outer, ...nested};
      }
      return flattened;
    })(source);
    copyLegacyField(card,"char_name","name");
    copyLegacyField(card,"char_persona","personality");
    copyLegacyField(card,"char_greeting","first_mes");
    copyLegacyField(card,"example_dialogue","mes_example");
    copyLegacyField(card,"world_scenario","scenario");
    copyLegacyField(card,"char_version","character_version");
    card.name = toText(card.name || fallbackName || "Nhân vật chưa đặt tên");
    card.description = toText(card.description);
    card.personality = toText(card.personality);
    card.scenario = toText(card.scenario);
    card.first_mes = toText(card.first_mes);
    card.mes_example = toText(card.mes_example);
    card.system_prompt = toText(card.system_prompt);
    card.post_history_instructions = toText(card.post_history_instructions);
    card.alternate_greetings = toTextArray(card.alternate_greetings);
    card.tags = toTextArray(card.tags);
    if (void 0 !== card.source) card.source = toTextArray(card.source);
    if ("chara_card_v3" === sourceSpec) card.group_only_greetings = toTextArray(card.group_only_greetings);
    if (!isRecordObject(card.extensions)) card.extensions = {};
    if (Array.isArray(card.regex_scripts) && !Array.isArray(card.extensions.regex_scripts)) card.extensions.regex_scripts = card.regex_scripts;
    (target => {
      let extensions = isRecordObject(target.extensions) ? target.extensions : {};
      let scriptsById = new Map;
      if (Array.isArray(extensions.TavernHelper_scripts)) extensions.TavernHelper_scripts.forEach((entry,index) => {
        if ("script" !== entry?.type || !isRecordObject(entry.value)) return;
        let scriptId = toText(entry.value.id || `script_${index}`);
        scriptsById.set(scriptId,{...entry,value:{...entry.value,id:scriptId}});
      });
      if (Array.isArray(extensions.tavern_helper)) for (let group of extensions.tavern_helper) {
        if (!Array.isArray(group) || "scripts" !== group[0] || !Array.isArray(group[1])) continue;
        group[1].forEach((script,index) => {
          if (!isRecordObject(script) || "script" !== script.type) return;
          let scriptId = toText(script.id || `legacy_script_${index}`);
          if (!scriptsById.has(scriptId)) scriptsById.set(scriptId,{type:"script",value:{
            ...script,id:scriptId,name:toText(script.name || scriptId),content:toText(script.content),
            enabled:false !== script.enabled,
            buttons:Array.isArray(script.buttons)?script.buttons:Array.isArray(script.button?.buttons)?script.button.buttons:[],
            data:isRecordObject(script.data)?script.data:{}
          }});
        });
      }
      if (scriptsById.size) extensions.TavernHelper_scripts = [...scriptsById.values()];
      target.extensions = extensions;
    })(card);
    let lorebook = card.character_book ?? card.char_book;
    if (void 0 !== lorebook) card.char_book = (0, dependencies.Mt)(lorebook);
    delete card.character_book;
    card.spec ||= sourceSpec;
    if (!card.spec_version && "chara_card_v3" === card.spec) card.spec_version = "3.0";
    if (!card.spec_version && "chara_card_v2" === card.spec) card.spec_version = "2.0";
    card.__source_spec = sourceSpec;
    return card;
  };
  var resolveEmbeddedAssetPath = uri => {
    let prefix = ["embeded://","embedded://","__asset:"].find(candidate => uri.toLowerCase().startsWith(candidate));
    if (!prefix) return null;
    let assetPath = uri.slice(prefix.length).replace(/\\/g,"/").replace(/^\/+/,"");
    try { assetPath = decodeURIComponent(assetPath); } catch {}
    return !assetPath || assetPath.split("/").some(segment => ".." === segment || "" === segment) ? null : assetPath;
  };
  var getAssetMimeType = fileName => ({png:"image/png",apng:"image/apng",jpg:"image/jpeg",jpeg:"image/jpeg",webp:"image/webp",gif:"image/gif",avif:"image/avif",bmp:"image/bmp",svg:"image/svg+xml",mp3:"audio/mpeg",wav:"audio/wav",ogg:"audio/ogg",m4a:"audio/mp4",flac:"audio/flac",mp4:"video/mp4",webm:"video/webm",json:"application/json",css:"text/css",js:"text/javascript",ttf:"font/ttf",otf:"font/otf",woff:"font/woff",woff2:"font/woff2"}[fileName.toLowerCase().split(".").pop()||""]||"application/octet-stream");
  var dataUrlToFile = (url, fileName) => {
    let match = url.match(/^data:([^;,]+)?(;base64)?,([\s\S]*)$/i);
    if (!match) return null;
    try {
      let mimeType = match[1] || "application/octet-stream";
      let bytes = match[2] ? Uint8Array.from(atob(match[3].replace(/\s+/g,"")),character=>character.charCodeAt(0)) : (new TextEncoder).encode(decodeURIComponent(match[3]));
      if (bytes.byteLength > MAX_CARD_METADATA_BYTES) throw Error("Asset quá lớn.");
      return new File([bytes],fileName,{type:mimeType});
    } catch { return null; }
  };
  var findIconAsset = assets => {
    if (!Array.isArray(assets)) return;
    let icons = assets.filter(asset => isRecordObject(asset) && "icon" === String(asset.type).toLowerCase() && "string" == typeof asset.uri);
    return icons.find(asset => "main" === String(asset.name).toLowerCase()) || icons[0];
  };
  var encodeBytesBase64 = bytes => {
    let binary = "";
    for (let index=0; index<bytes.length; index+=32768) binary += String.fromCharCode(...bytes.subarray(index,index+32768));
    return btoa(binary);
  };
  var parseCharacterFile = async file => {
    if (!file || 0 === file.size) throw Error("Tệp nhân vật đang trống.");
    if (file.size > 209715200) throw Error("Tệp nhân vật vượt quá giới hạn 200 MB.");
    let rawCard, format, buffer = await file.arrayBuffer(), bytes = new Uint8Array(buffer), avatarFile = null, embeddedAssets = {};
    if (isPngBytes(bytes)) {
      let png = await (async arrayBuffer => {
        let pngBytes = new Uint8Array(arrayBuffer);
        if (!isPngBytes(pngBytes)) throw Error("Đây không phải là một tệp PNG/APNG hợp lệ.");
        let view = new DataView(arrayBuffer), metadata = new Map, assets = {}, assetBytes = 0, offset = 8, chunkCount = 0, hasEndChunk = false;
        for (; offset < view.byteLength;) {
          if (++chunkCount > 1e5) throw Error("Tệp PNG chứa quá nhiều chunk.");
          if (chunkCount % 100 == 0) await yieldToEventLoop();
          if (offset + 12 > view.byteLength) throw Error("Tệp PNG bị cắt cụt gần cuối tệp.");
          let chunkLength = view.getUint32(offset), nextOffset = offset + 12 + chunkLength;
          if (chunkLength > MAX_CARD_METADATA_BYTES && 116 === pngBytes[offset+4]) throw Error("Chunk metadata PNG vượt quá giới hạn an toàn.");
          if (nextOffset > view.byteLength || nextOffset <= offset) throw Error("Tệp PNG có chunk vượt quá giới hạn tệp.");
          let chunkType = new TextDecoder("latin1").decode(pngBytes.subarray(offset+4,offset+8));
          if ("tEXt" === chunkType) {
            let chunkData = pngBytes.subarray(offset+8,offset+8+chunkLength), separator = chunkData.indexOf(0);
            if (separator > 0) {
              let keyword = new TextDecoder("latin1").decode(chunkData.subarray(0,separator)), lowerKeyword = keyword.toLowerCase();
              let value = new TextDecoder("latin1").decode(chunkData.subarray(separator+1));
              if ("ccv3" === lowerKeyword || "chara" === lowerKeyword) metadata.set(lowerKeyword,value);
              else if (lowerKeyword.startsWith("chara-ext-asset_:")) {
                let assetName = keyword.slice(17), base64 = value.replace(/\s+/g,""), size = Math.floor(3*base64.length/4);
                if (assetName && /^[A-Za-z0-9+/]*={0,2}$/.test(base64) && size <= MAX_CARD_METADATA_BYTES && assetBytes+size <= MAX_EMBEDDED_ASSET_BYTES) {
                  assetBytes += size;
                  assets[`__asset:${assetName}`] = `data:${getAssetMimeType(assetName)};base64,${base64}`;
                }
              }
            }
          }
          if ("IEND" === chunkType) { hasEndChunk = true; break; }
          offset = nextOffset;
        }
        if (!hasEndChunk) throw Error("Tệp PNG bị hỏng hoặc thiếu chunk IEND.");
        let keyword = metadata.has("ccv3") ? "ccv3" : metadata.has("chara") ? "chara" : null;
        if (!keyword) throw Error("Không tìm thấy metadata nhân vật `ccv3` hoặc `chara` trong tệp PNG.");
        return {keyword:keyword,json:decodePngBase64Metadata(metadata.get(keyword)),embeddedAssets:assets};
      })(buffer);
      rawCard = parseCardJson(png.json,`${file.name}/${png.keyword}`);
      embeddedAssets = png.embeddedAssets;
      avatarFile = file;
      format = "png";
    } else if ((value => value.length>=4 && 80===value[0] && 75===value[1] && (3===value[2]&&4===value[3]||5===value[2]&&6===value[3]||7===value[2]&&8===value[3]))(bytes) || file.name.toLowerCase().endsWith(".charx")) {
      let charx = await (async (archiveFile, archiveBuffer) => {
        let archive;
        try {
          archive = await (await (0, dependencies.nc)(async () => {
            let {default: zipLibrary} = await import("../../../jszip.min-CF4xG0Dr.js").then(module => (0, dependencies.l)(module.default,1));
            return {default:zipLibrary};
          })).default.loadAsync(archiveBuffer || await archiveFile.arrayBuffer());
        } catch (error) { throw Error("Tệp CHARX/ZIP bị hỏng hoặc không thể giải nén.",{cause:error}); }
        let entries = Object.values(archive.files);
        if (entries.length > 1e4) throw Error("Tệp CHARX chứa quá nhiều mục.");
        if (entries.reduce((total,entry) => {
          let size = Number(entry._data?.uncompressedSize);
          return total + (Number.isFinite(size)&&size>0?size:0);
        },0) > 536870912) throw Error("Tệp CHARX có kích thước giải nén vượt quá giới hạn an toàn.");
        if (entries.some(entry => entry.name.replace(/\\/g,"/").split("/").includes(".."))) throw Error("Tệp CHARX chứa đường dẫn không an toàn.");
        let cardEntry = archive.file("card.json") || entries.find(entry => !entry.dir && "card.json" === entry.name.toLowerCase());
        if (!cardEntry) throw Error("Tệp CHARX không có card.json ở thư mục gốc.");
        let cardSize = Number(cardEntry._data?.uncompressedSize);
        if (Number.isFinite(cardSize) && cardSize > MAX_CARD_METADATA_BYTES) throw Error("card.json trong CHARX quá lớn.");
        let json = await cardEntry.async("string");
        if ((new TextEncoder).encode(json).byteLength > MAX_CARD_METADATA_BYTES) throw Error("card.json trong CHARX quá lớn.");
        let raw = parseCardJson(json,`${archiveFile.name}/card.json`);
        let data = isRecordObject(raw?.data) ? raw.data : raw;
        let assets = await (async (zip, zipEntries, descriptors) => {
          let result = {};
          if (!Array.isArray(descriptors)) return result;
          let totalBytes = 0;
          for (let descriptor of descriptors) {
            if (!isRecordObject(descriptor) || "string" != typeof descriptor.uri) continue;
            if (descriptor.uri.startsWith("data:")) { result[descriptor.uri] = descriptor.uri; continue; }
            let assetPath = resolveEmbeddedAssetPath(descriptor.uri);
            if (!assetPath) continue;
            let entry = zip.file(assetPath) || zipEntries.find(item => !item.dir && item.name.toLowerCase() === assetPath.toLowerCase());
            if (!entry) continue;
            let size = Number(entry._data?.uncompressedSize);
            if (Number.isFinite(size) && (size > MAX_CARD_METADATA_BYTES || totalBytes+size > MAX_EMBEDDED_ASSET_BYTES)) continue;
            let assetData = await entry.async("uint8array");
            if (assetData.byteLength > MAX_CARD_METADATA_BYTES || totalBytes+assetData.byteLength > MAX_EMBEDDED_ASSET_BYTES) continue;
            totalBytes += assetData.byteLength;
            let url = `data:${getAssetMimeType(assetPath)};base64,${encodeBytesBase64(assetData)}`;
            result[descriptor.uri] = url;
            result[`embeded://${assetPath}`] = url;
            result[`embedded://${assetPath}`] = url;
            result[`__asset:${assetPath}`] = url;
          }
          return result;
        })(archive,entries,data?.assets);
        let icon = findIconAsset(data?.assets), avatar = null;
        if (icon?.uri.startsWith("data:")) avatar = dataUrlToFile(icon.uri,`main.${icon.ext||"png"}`);
        else if (icon) {
          let iconPath = resolveEmbeddedAssetPath(icon.uri);
          let entry = iconPath ? archive.file(iconPath) || entries.find(item => !item.dir && item.name.toLowerCase() === iconPath.toLowerCase()) : null;
          if (entry) {
            let avatarData = await entry.async("uint8array");
            if (avatarData.byteLength > MAX_CARD_METADATA_BYTES) throw Error("Avatar trong CHARX quá lớn.");
            avatar = new File([Uint8Array.from(avatarData).buffer],entry.name.split("/").pop()||"main.png",{type:getAssetMimeType(entry.name)});
          }
        }
        if (!avatar) {
          let fallbackEntry = entries.find(entry => !entry.dir && /^assets\/icon\/(?:[^/]+\/)*[^/]+\.(png|apng|jpe?g|webp|gif|avif|bmp)$/i.test(entry.name));
          if (fallbackEntry) {
            let size = Number(fallbackEntry._data?.uncompressedSize);
            if (!Number.isFinite(size) || size <= MAX_CARD_METADATA_BYTES) {
              let avatarData = await fallbackEntry.async("uint8array");
              if (avatarData.byteLength <= MAX_CARD_METADATA_BYTES) avatar = new File([Uint8Array.from(avatarData).buffer],fallbackEntry.name.split("/").pop()||"main.png",{type:getAssetMimeType(fallbackEntry.name)});
            }
          }
        }
        return {rawCard:raw,avatarFile:avatar,embeddedAssets:assets};
      })(file,buffer);
      rawCard = charx.rawCard;
      avatarFile = charx.avatarFile;
      embeddedAssets = charx.embeddedAssets;
      format = "charx";
    } else {
      rawCard = parseCardJson(new TextDecoder("utf-8",{fatal:true}).decode(bytes),file.name);
      format = "json";
    }
    let card = normalizeCharacterCard(rawCard,(name => name.replace(/\.(?:json|json5|png|apng|charx)$/i,"").trim())(file.name));
    if (Object.keys(embeddedAssets).length) card.__embedded_assets = embeddedAssets;
    if (!avatarFile) {
      let icon = findIconAsset(card.assets);
      if (icon?.uri.startsWith("data:")) avatarFile = dataUrlToFile(icon.uri,`main.${icon.ext||"png"}`);
    }
    return {card:card,avatarUrl:avatarFile?URL.createObjectURL(avatarFile):null,avatarFile:avatarFile,format:format};
  };
  return { oc: isRecordObject, mc: mergeCardObjects, gc: normalizeCharacterCard, _c: parseCharacterFile };
}
