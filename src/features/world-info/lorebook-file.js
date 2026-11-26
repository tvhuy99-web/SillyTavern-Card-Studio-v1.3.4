// Recovered from the application host. One owner; dependency getters preserve late binding.
export function createLorebookFileCodec(dependencies = {}) {
  var isRecordObject = value => "object" == typeof value && !!value && !Array.isArray(value);
  var toStringList = value => Array.isArray(value) ? value.map(item => String(item)).filter(Boolean) : null == value || "" === value ? [] : [String(value)];
  var stableHash = text => {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index++) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  };
  var firstDefined = (...values) => values.find(value => null != value);
  var normalizeLorebook = value => {
    let book = isRecordObject(value) ? value : {};
    let rawEntries = Array.isArray(book.entries) ? book.entries : isRecordObject(book.entries) ? Object.values(book.entries) : [];
    let usedUids = new Set();
    let entries = rawEntries.map((value, entryIndex) => {
      let rawEntry = isRecordObject(value) ? value : {content: null == value ? "" : String(value)};
      let extensions = isRecordObject(rawEntry.extensions) ? {...rawEntry.extensions} : {};
      let entry = {
        ...rawEntry,
        keys: toStringList(firstDefined(rawEntry.keys, rawEntry.key)),
        secondary_keys: toStringList(firstDefined(rawEntry.secondary_keys, rawEntry.keysecondary)),
        content: void 0 === rawEntry.content || null === rawEntry.content ? "" : String(rawEntry.content),
        enabled: false !== rawEntry.enabled, selective: true === rawEntry.selective,
        constant: true === rawEntry.constant, use_regex: true === rawEntry.use_regex, extensions: extensions
      };
      entry.case_sensitive = !!firstDefined(rawEntry.case_sensitive, extensions.case_sensitive, false);
      entry.match_whole_words = !!firstDefined(rawEntry.match_whole_words, extensions.match_whole_words, false);
      entry.sticky = Number(firstDefined(rawEntry.sticky, extensions.sticky, 0)) || 0;
      entry.cooldown = Number(firstDefined(rawEntry.cooldown, extensions.cooldown, 0)) || 0;
      entry.probability = Math.max(0, Math.min(100, Number(firstDefined(rawEntry.probability, extensions.probability, 100)) || 0));
      entry.use_probability = !!firstDefined(rawEntry.use_probability, rawEntry.useProbability, extensions.use_probability, extensions.useProbability, false);
      let insertionOrder = Number(rawEntry.insertion_order);
      entry.insertion_order = Number.isFinite(insertionOrder) ? insertionOrder : entryIndex;
      if (void 0 !== rawEntry.position && null !== rawEntry.position) entry.position = String(rawEntry.position);
      let baseUid = "string" == typeof rawEntry.uid && rawEntry.uid.trim() ? rawEntry.uid.trim()
        : void 0 !== rawEntry.id && null !== rawEntry.id ? `entry_${String(rawEntry.id)}`
        : `entry_${stableHash(`${entryIndex}\0${entry.content}\0${entry.keys.join("\0")}`)}`;
      let uid = baseUid, suffix = 2;
      for (; usedUids.has(uid);) uid = `${baseUid}_${suffix++}`;
      usedUids.add(uid);
      entry.uid = uid;
      return entry;
    });
    return {...book, name: void 0 === book.name || null === book.name ? void 0 : String(book.name), entries: entries, extensions: isRecordObject(book.extensions) ? {...book.extensions} : {}};
  };
  var parseLorebookFile = async file => {
    if (!file.size) throw Error(`Không thể đọc lorebook "${file.name}": tệp trống.`);
    if (file.size > 5e7) throw Error(`Không thể đọc lorebook "${file.name}": tệp vượt quá giới hạn 50 MB.`);
    let root;
    try {
      let text = (await file.text()).replace(/^\uFEFF/,"");
      root = dependencies.relaxedJson.default.parse(text);
    } catch (error) {
      throw Error(`Không thể đọc lorebook "${file.name}": tệp JSON không hợp lệ.`, {cause: error});
    }
    if (!isRecordObject(root)) throw Error(`Không thể đọc lorebook "${file.name}": dữ liệu gốc phải là một đối tượng JSON.`);
    let data = isRecordObject(root.data) ? root.data : void 0;
    let rawBook = root.character_book ?? root.char_book ?? data?.character_book ?? data?.char_book ?? (void 0 === root.entries ? void 0 === data?.entries ? void 0 : data : root);
    if (!isRecordObject(rawBook)) throw Error(`Không thể đọc lorebook "${file.name}": không tìm thấy trường entries hoặc character_book.`);
    let book = normalizeLorebook(rawBook);
    let fileHash = stableHash(`${file.name}\0${book.name || ""}`);
    book.entries = book.entries.map(entry => ({...entry, uid: `lb_${fileHash}_${entry.uid}`}));
    return {name: book.name || file.name, book: book};
  };
  return { normalizeLorebook, parseLorebookFile };
}
