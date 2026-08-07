from pathlib import Path
import re, json, shutil, textwrap

ROOT=Path('/mnt/data/cardstudio_work')
BUNDLE=ROOT/'assets/index-11db71a5-modeltest-v2-htmlmodes-v1.js'
T0=ROOT/'template-0.txt'
T1=ROOT/'template-1.txt'

def replace_once(s, old, new, label):
    c=s.count(old)
    if c != 1:
        raise RuntimeError(f'{label}: expected 1 occurrence, got {c}')
    return s.replace(old,new,1)

def replace_regex_once(s, pattern, repl, label, flags=re.S):
    out,n=re.subn(pattern,repl,s,count=1,flags=flags)
    if n!=1: raise RuntimeError(f'{label}: expected 1 match, got {n}')
    return out

t1=T1.read_text()
t0=T0.read_text()

# Runtime version consistency.
t1=replace_once(t1,"const IMPLEMENTATION_VERSION = '${\"4.8.19-compat.9\"}';","const IMPLEMENTATION_VERSION = '${\"4.8.19-compat.11\"}';",'runtime version')

# Variables: validate schemas, emit lifecycle events, and roll back optimistic cache if persistence fails.
old='''    function persistScope(option, variables) {
        const normalized = normalizeOption(option);
        if (normalized.type === 'script' && !normalized.script_id) normalized.script_id = activeScriptId || 'default';
        if (normalized.type === 'message' && normalized.message_id === undefined) normalized.message_id = 'latest';
        const key = scopeKey(normalized);
        const clean = clone(asObject(variables));
        scopeCache.set(key, clean);
        if (normalized.type === 'chat') {
            root.__st_live_data = clean;
            root.stat_data = clean && clean.stat_data ? clean.stat_data : clean;
        }
        rpc('variables.replace', { option: normalized, variables: clean }, 30000).catch(function (error) {
            log('warn', 'Could not persist ' + key + ' variables: ' + error.message);
        });
        return clone(clean);
    }'''
new='''    function validateScopeValue(key, variables) {
        const schema = schemaCache.get(key);
        if (!schema) return clone(asObject(variables));
        try {
            if (typeof schema.parse === 'function') return clone(asObject(schema.parse(variables)));
            if (typeof schema.safeParse === 'function') {
                const result = schema.safeParse(variables);
                if (!result || result.success !== true) throw new Error('Variable schema validation failed for ' + key);
                return clone(asObject(result.data));
            }
        } catch (error) {
            diagnostic('CARD_RUNTIME_STORAGE_FAILED', 'variables', 'schema-validation', error && error.message || String(error), { method: 'replaceVariables', details: { scope: key } });
            throw error;
        }
        return clone(asObject(variables));
    }
    function persistScope(option, variables) {
        const normalized = normalizeOption(option);
        if (normalized.type === 'script' && !normalized.script_id) normalized.script_id = activeScriptId || 'default';
        if (normalized.type === 'message' && normalized.message_id === undefined) normalized.message_id = 'latest';
        const key = scopeKey(normalized);
        const previous = clone(scopeValue(normalized));
        const clean = validateScopeValue(key, variables);
        scopeCache.set(key, clean);
        if (normalized.type === 'chat') {
            root.__st_live_data = clean;
            root.stat_data = clean && clean.stat_data ? clean.stat_data : clean;
        }
        emitEvent('mvu-variable-update-started', { scope: normalized, variables: clone(clean) });
        rpc('variables.replace', { option: normalized, variables: clean }, 30000).then(function () {
            emitEvent('mvu-variable-update-ended', { scope: normalized, variables: clone(clean), stat_data: root.stat_data });
        }).catch(function (error) {
            scopeCache.set(key, previous);
            if (normalized.type === 'chat') {
                root.__st_live_data = previous;
                root.stat_data = previous && previous.stat_data ? previous.stat_data : previous;
            }
            emitEvent('mvu-variable-update-ended', { scope: normalized, variables: clone(previous), error: error && error.message });
            log('warn', 'Could not persist ' + key + ' variables; local state was rolled back: ' + error.message);
        });
        return clone(clean);
    }'''
t1=replace_once(t1,old,new,'persistScope')

old="""    function pathParts(path) {
        if (Array.isArray(path)) return path.map(String).filter(Boolean);
        return String(path || '').replace(/\[(?:\"([^\"]+)\"|'([^']+)'|(\d+))\]/g, '.$1$2$3').split('.').filter(Boolean);
    }"""
new="""    function pathParts(path) {
        if (Array.isArray(path)) return path.map(String).filter(function (part) { return part !== ''; });
        const source = String(path == null ? '' : path);
        const parts = [];
        let token = '';
        let quote = '';
        let escaped = false;
        let bracket = false;
        for (let index = 0; index < source.length; index += 1) {
            const char = source[index];
            if (escaped) { token += char; escaped = false; continue; }
            if (char === '\\\\') { escaped = true; continue; }
            if (quote) {
                if (char === quote) quote = '';
                else token += char;
                continue;
            }
            if (bracket && (char === '\"' || char === "'")) { quote = char; continue; }
            if (!bracket && char === '.') { if (token !== '') parts.push(token); token = ''; continue; }
            if (!bracket && char === '[') { if (token !== '') parts.push(token); token = ''; bracket = true; continue; }
            if (bracket && char === ']') { if (token !== '') parts.push(token.trim()); token = ''; bracket = false; continue; }
            token += char;
        }
        if (escaped) token += '\\\\';
        if (token !== '') parts.push(token);
        return parts.filter(function (part) { return part !== ''; });
    }"""
t1=replace_once(t1,old,new,'pathParts')

# Chat message mutations now match TavernHelper Promise<void> and emit the closest supported refresh events.
old='''    async function applyChatMutation(method, args) {
        const result = await rpc(method, args, 60000);
        if (result && Array.isArray(result.chatHistory)) chatHistory = clone(result.chatHistory);
        syncContext();
        return clone(result && (result.messages || result.chatHistory) || result);
    }'''
new='''    async function applyChatMutation(method, args) {
        const result = await rpc(method, args, 60000);
        if (result && Array.isArray(result.chatHistory)) chatHistory = clone(result.chatHistory);
        syncContext();
        const refresh = args && args.option && args.option.refresh || 'affected';
        if (method === 'chat.create') await emitEvent(root.tavern_events.MESSAGE_RECEIVED, result && result.messageId);
        if (method === 'chat.set') await emitEvent(root.tavern_events.MESSAGE_UPDATED, result && result.messageId);
        if (method === 'chat.delete') await emitEvent(root.tavern_events.MESSAGE_DELETED, result && result.messageId);
        if (refresh === 'all') await emitEvent(root.tavern_events.CHAT_CHANGED, BOOT.context.chatId);
        else if (refresh === 'affected') await emitEvent(root.tavern_events.CHARACTER_MESSAGE_RENDERED, result && result.messageId);
        return undefined;
    }'''
t1=replace_once(t1,old,new,'chat mutation return')

# Generation: preserve official sync stop semantics as closely as possible and pass custom API to model lookup.
old='''    root.generate = function (options) {
        const merged = Object.assign({}, options || {});
        merged.injects = Array.from(promptInjects.values()).concat(Array.isArray(merged.injects) ? merged.injects : []);
        return rpc('generation.generate', { raw: false, options: merged }, 360000);
    };
    root.generateRaw = function (options) {
        const merged = Object.assign({}, options || {});
        merged.injects = Array.from(promptInjects.values()).concat(Array.isArray(merged.injects) ? merged.injects : []);
        return rpc('generation.generate', { raw: true, options: merged }, 360000);
    };
    root.stopGenerationById = function (generationId) { rpc('generation.stop', { generationId: generationId }, 10000).catch(function () {}); return true; };
    root.stopAllGeneration = function () { rpc('generation.stopAll', {}, 10000).catch(function () {}); return true; };
    root.getModelList = function () { return rpc('generation.models', {}, 30000); };
    root.getProxyPresetNames = function () { return Promise.resolve(BOOT.context.presetName ? [BOOT.context.presetName] : []); };'''
new='''    const activeGenerationIds = new Set();
    function prepareGenerationOptions(options) {
        const merged = Object.assign({}, options || {});
        if (!merged.generation_id) merged.generation_id = uuid();
        merged.injects = Array.from(promptInjects.values()).concat(Array.isArray(merged.injects) ? merged.injects : []);
        if (merged.images !== undefined && merged.image === undefined) merged.image = merged.images;
        return merged;
    }
    function runGeneration(raw, options) {
        const merged = prepareGenerationOptions(options);
        activeGenerationIds.add(String(merged.generation_id));
        return rpc('generation.generate', { raw: raw, options: merged }, 360000).finally(function () { activeGenerationIds.delete(String(merged.generation_id)); });
    }
    root.generate = function (options) { return runGeneration(false, options); };
    root.generateRaw = function (options) { return runGeneration(true, options); };
    root.stopGenerationById = function (generationId) {
        const id = String(generationId || '');
        if (!activeGenerationIds.has(id)) return false;
        activeGenerationIds.delete(id);
        rpc('generation.stop', { generationId: id }, 10000).catch(function (error) { log('warn', 'Could not stop generation ' + id + ': ' + error.message); });
        return true;
    };
    root.stopAllGeneration = function () {
        const hadActive = activeGenerationIds.size > 0;
        activeGenerationIds.clear();
        if (hadActive) rpc('generation.stopAll', {}, 10000).catch(function (error) { log('warn', 'Could not stop all generations: ' + error.message); });
        return hadActive;
    };
    root.getModelList = function (customApi) { return rpc('generation.models', { custom_api: customApi || null }, 30000).then(function (models) { return Array.from(new Set((Array.isArray(models) ? models : []).map(String).filter(Boolean))).sort(); }); };
    root.getProxyPresetNames = function () {
        const profiles = BOOT.proxyProfiles || BOOT.catalog && BOOT.catalog.proxyProfiles || [];
        return Array.from(new Set((Array.isArray(profiles) ? profiles : []).map(function (profile) { return String(profile && (profile.name || profile.id) || ''); }).filter(Boolean)));
    };'''
t1=replace_once(t1,old,new,'generation API')

old='''        extensionManagement: true,
        rawImport: true,
        scriptButtons: true,
        hudMirror: true,
        streamingPreview: true,
        parentDomCompatibility: true,
        fullCompatibility: FULL_COMPATIBILITY_MODE'''
new='''        extensionManagement: false,
        rawImport: OFFICIAL_LOCAL_ENGINE,
        scriptButtons: true,
        scriptTrees: true,
        hudMirror: true,
        streamingPreview: true,
        toolCalling: false,
        structuredOutput: false,
        providerParity: false,
        parentDomCompatibility: FULL_COMPATIBILITY_MODE,
        fullCompatibility: FULL_COMPATIBILITY_MODE'''
t1=replace_once(t1,old,new,'capabilities truthfulness')

# Worldbook contract replacement.
start=t1.index("    let lorebookNames = Array.from(new Set(BOOT.lorebookNames || []));")
end=t1.index("    let lorebookSettings =",start)
old=t1[start:end]
new='''    let lorebookNames = Array.from(new Set(BOOT.lorebookNames || []));
    let globalWorldbookNames = clone(extensionSettings.__cardRuntimeGlobalWorldbooks || []);
    let chatWorldbookName = extensionSettings.__cardRuntimeChatWorldbook || null;
    let charWorldbooks = clone(extensionSettings.__cardRuntimeCharWorldbooks || null);
    root.getLorebooks = root.getWorldbookNames = function () { return clone(lorebookNames); };
    root.getGlobalWorldbookNames = function () { return clone(globalWorldbookNames); };
    root.getCharWorldbookNames = function () {
        if (charWorldbooks && typeof charWorldbooks === 'object') return { primary: charWorldbooks.primary || null, additional: clone(Array.isArray(charWorldbooks.additional) ? charWorldbooks.additional : []) };
        const primary = root.getCurrentCharPrimaryLorebook();
        return { primary: primary, additional: [] };
    };
    root.getChatWorldbookName = root.getChatLorebook = function () { return chatWorldbookName; };
    root.getLorebookEntries = function (name) { return rpc('lorebook.entries.get', { name: name }, 30000).then(function (entries) { return clone(Array.isArray(entries) ? entries : []); }); };
    root.replaceLorebookEntries = function (name, entries) {
        if (!Array.isArray(entries)) return Promise.reject(new TypeError('replaceLorebookEntries expected an array'));
        return rpc('lorebook.entries.replace', { name: name, entries: clone(entries) }, 60000).then(function (result) { return clone(Array.isArray(result) ? result : entries); });
    };
    root.updateLorebookEntriesWith = root.updatelorebookEntriesWith = async function (name, updater) {
        updater = requireFunctionCallback('updateLorebookEntriesWith', updater);
        const entries = await root.getLorebookEntries(name);
        const updated = await updater(clone(entries));
        const next = updated === undefined ? entries : updated;
        if (!Array.isArray(next)) throw new TypeError('Worldbook updater must return an array');
        await root.replaceLorebookEntries(name, next);
        return await root.getLorebookEntries(name);
    };
    root.setLorebookEntries = async function (name, patches) {
        const current = await root.getLorebookEntries(name);
        const patchMap = new Map((Array.isArray(patches) ? patches : []).map(function (entry) { return [String(entry.uid), entry]; }));
        const updated = current.map(function (entry) { return patchMap.has(String(entry.uid)) ? Object.assign({}, entry, clone(patchMap.get(String(entry.uid)))) : entry; });
        await root.replaceLorebookEntries(name, updated);
        return updated;
    };
    root.createLorebookEntries = async function (name, entries) {
        const additions = (Array.isArray(entries) ? entries : [entries]).filter(Boolean);
        const result = await rpc('lorebook.entries.create', { name: name, entries: additions }, 60000);
        const worldbook = await root.getLorebookEntries(name);
        let newEntries = [];
        if (result && Array.isArray(result.new_entries)) newEntries = result.new_entries;
        else if (result && Array.isArray(result.new_uids)) {
            const ids = new Set(result.new_uids.map(String));
            newEntries = worldbook.filter(function (entry) { return ids.has(String(entry.uid)); });
        } else newEntries = worldbook.slice(Math.max(0, worldbook.length - additions.length));
        return { worldbook: worldbook, new_entries: clone(newEntries) };
    };
    root.deleteLorebookEntries = async function (name, predicateOrRange) {
        const current = await root.getLorebookEntries(name);
        let deleted = [];
        let next = current;
        if (typeof predicateOrRange === 'function') {
            deleted = current.filter(function (entry) { return Boolean(predicateOrRange(clone(entry))); });
            const deletedIds = new Set(deleted.map(function (entry) { return String(entry.uid); }));
            next = current.filter(function (entry) { return !deletedIds.has(String(entry.uid)); });
        } else {
            const result = await rpc('lorebook.entries.delete', { name: name, range: predicateOrRange }, 60000);
            const worldbook = await root.getLorebookEntries(name);
            const remainingIds = new Set(worldbook.map(function (entry) { return String(entry.uid); }));
            deleted = current.filter(function (entry) { return !remainingIds.has(String(entry.uid)); });
            return { worldbook: worldbook, deleted_entries: deleted, delete_occurred: Boolean(result && result.delete_occurred || deleted.length) };
        }
        await root.replaceLorebookEntries(name, next);
        return { worldbook: next, deleted_entries: deleted, delete_occurred: deleted.length > 0 };
    };
    root.createLorebook = root.createWorldbook = async function (name, entries) {
        const existed = lorebookNames.includes(String(name));
        if (existed) return false;
        await rpc('lorebook.create', { name: name, entries: Array.isArray(entries) ? entries : [] }, 60000);
        if (!lorebookNames.includes(String(name))) lorebookNames.push(String(name));
        return true;
    };
    root.deleteLorebook = root.deleteWorldbook = async function (name) { const result = await rpc('lorebook.delete', { name: name }, 60000); lorebookNames = lorebookNames.filter(function (item) { return item !== name; }); return Boolean(result); };
    root.getWorldbook = function (name) { return root.getLorebookEntries(name); };
    root.replaceWorldbook = async function (name, worldbook, options) {
        if (!Array.isArray(worldbook)) throw new TypeError('replaceWorldbook expected WorldbookEntry[]; refusing to overwrite data with an invalid value');
        await root.replaceLorebookEntries(name, worldbook);
        await emitEvent(root.tavern_events.WORLDINFO_UPDATED, name, options || {});
    };
    root.updateWorldbookWith = async function (name, updater, options) {
        updater = requireFunctionCallback('updateWorldbookWith', updater);
        const current = await root.getWorldbook(name);
        const updated = await updater(clone(current));
        const next = updated === undefined ? current : updated;
        if (!Array.isArray(next)) throw new TypeError('Worldbook updater must return WorldbookEntry[]');
        await root.replaceWorldbook(name, next, options);
        return await root.getWorldbook(name);
    };
    root.createOrReplaceWorldbook = async function (name, worldbook, options) {
        const existed = lorebookNames.includes(String(name));
        if (!existed) await root.createWorldbook(name, []);
        await root.replaceWorldbook(name, Array.isArray(worldbook) ? worldbook : [], options);
        return !existed;
    };
    root.getOrCreateChatLorebook = root.getOrCreateChatWorldbook = async function (requestedName) {
        const name = requestedName || chatWorldbookName || BOOT.context.chatId + '-chat-lorebook';
        if (!lorebookNames.includes(name)) await root.createLorebook(name, []);
        await root.rebindChatWorldbook('current', name);
        return name;
    };
    root.getCurrentCharPrimaryLorebook = function () { return BOOT.characterCard && BOOT.characterCard.char_book ? (BOOT.characterCard.char_book.name || BOOT.context.name2) : null; };
    root.getCharLorebooks = root.getCharWorldbookNames;
    root.setCurrentCharLorebooks = root.rebindCharWorldbooks = async function (characterName, bindings) {
        if (arguments.length === 1 && characterName && typeof characterName === 'object') { bindings = characterName; characterName = 'current'; }
        if (characterName !== 'current') throw new Error('Only the current character can be rebound in Card Studio');
        charWorldbooks = { primary: bindings && bindings.primary || null, additional: clone(bindings && Array.isArray(bindings.additional) ? bindings.additional : []) };
        extensionSettings.__cardRuntimeCharWorldbooks = clone(charWorldbooks);
        await rpc('extension.settings.save', { settings: extensionSettings }, 30000);
        await emitEvent(root.tavern_events.WORLDINFO_SETTINGS_UPDATED, clone(charWorldbooks));
    };
    root.rebindGlobalWorldbooks = async function (names) {
        globalWorldbookNames = Array.from(new Set((Array.isArray(names) ? names : []).map(String)));
        extensionSettings.__cardRuntimeGlobalWorldbooks = clone(globalWorldbookNames);
        await rpc('extension.settings.save', { settings: extensionSettings }, 30000);
        await emitEvent(root.tavern_events.WORLDINFO_SETTINGS_UPDATED, clone(globalWorldbookNames));
    };
    root.rebindChatWorldbook = async function (_chatName, name) {
        chatWorldbookName = name || null;
        extensionSettings.__cardRuntimeChatWorldbook = chatWorldbookName;
        await rpc('extension.settings.save', { settings: extensionSettings }, 30000);
        await emitEvent(root.tavern_events.WORLDINFO_SETTINGS_UPDATED, chatWorldbookName);
    };
    root.createWorldbookEntries = root.createLorebookEntries;
    root.deleteWorldbookEntries = root.deleteLorebookEntries;
    root.createLorebookEntry = async function (name, entry) {
        const result = await root.createLorebookEntries(name, [entry]);
        return result.new_entries.length ? result.new_entries[0].uid : null;
    };
    root.deleteLorebookEntry = async function (name, uid) { const result = await root.deleteLorebookEntries(name, function (entry) { return String(entry.uid) === String(uid); }); return result.delete_occurred; };
    root.setChatLorebook = function (name) { return root.rebindChatWorldbook('current', name).then(function () { return chatWorldbookName; }); };
'''
t1=t1[:start]+new+t1[end:]

# Regex scopes and official signature.
start=t1.index("    function compileRegex(source) {")
end=t1.index("    const storageState =",start)
old=t1[start:end]
new='''    function compileRegex(source) {
        if (source instanceof RegExp) return source;
        const match = String(source || '').match(/^\\/(.*)\\/([dgimsuvy]*)$/s);
        try { return match ? new RegExp(match[1], match[2]) : new RegExp(String(source || ''), 'g'); } catch (_) { return null; }
    }
    const regexScopes = {
        global: clone(extensionSettings.__cardRuntimeGlobalRegexes || []),
        preset: clone(extensionSettings.__cardRuntimePresetRegexes || []),
        character: clone(BOOT.characterCard && BOOT.characterCard.extensions && (BOOT.characterCard.extensions.regex_scripts || BOOT.characterCard.extensions.RegexScripts) || [])
    };
    function regexScope(option) { return option && option.type === 'global' ? 'global' : option && option.type === 'preset' ? 'preset' : 'character'; }
    function normalizeRegex(script) {
        const source = script && script.source || {};
        const destination = script && script.destination || {};
        return Object.assign({}, clone(script || {}), {
            id: String(script && script.id || uuid()),
            script_name: String(script && (script.script_name || script.scriptName) || ''),
            enabled: script && script.enabled !== undefined ? Boolean(script.enabled) : !(script && script.disabled),
            find_regex: String(script && (script.find_regex || script.findRegex) || ''),
            replace_string: String(script && (script.replace_string || script.replaceString) || ''),
            trim_strings: clone(script && (script.trim_strings || script.trimStrings) || []),
            source: { user_input: source.user_input !== false, ai_output: source.ai_output !== false, slash_command: Boolean(source.slash_command), world_info: Boolean(source.world_info), reasoning: Boolean(source.reasoning) },
            destination: { display: destination.display !== false, prompt: destination.prompt !== false },
            run_on_edit: Boolean(script && (script.run_on_edit || script.runOnEdit)),
            min_depth: script && (script.min_depth ?? script.minDepth) ?? null,
            max_depth: script && (script.max_depth ?? script.maxDepth) ?? null
        });
    }
    root.getTavernRegexes = function (option) { return clone(regexScopes[regexScope(option)].map(normalizeRegex)); };
    root.replaceTavernRegexes = async function (regexes, option) {
        const scope = regexScope(option);
        regexScopes[scope] = clone((Array.isArray(regexes) ? regexes : []).map(normalizeRegex));
        if (scope === 'character') await rpc('regex.replace', { regexes: regexScopes.character }, 60000);
        else {
            extensionSettings[scope === 'global' ? '__cardRuntimeGlobalRegexes' : '__cardRuntimePresetRegexes'] = clone(regexScopes[scope]);
            await rpc('extension.settings.save', { settings: extensionSettings }, 30000);
        }
        return undefined;
    };
    root.updateTavernRegexesWith = async function (updater, option) {
        updater = requireFunctionCallback('updateTavernRegexesWith', updater);
        const current = root.getTavernRegexes(option);
        const result = await updater(clone(current));
        const next = result === undefined ? current : result;
        if (!Array.isArray(next)) throw new TypeError('Regex updater must return TavernRegex[]');
        await root.replaceTavernRegexes(next, option);
        return root.getTavernRegexes(option);
    };
    root.isCharacterTavernRegexesEnabled = function () { return extensionSettings.__cardRuntimeCharacterRegexEnabled !== false; };
    root.formatAsTavernRegexedString = function (input, source, destination, options) {
        if (typeof source === 'number' || Array.isArray(source)) { options = destination || {}; destination = source === 1 ? 'prompt' : 'display'; source = 'ai_output'; }
        source = source || 'ai_output';
        destination = destination || 'display';
        options = options || {};
        let output = safeString(input);
        const lists = regexScopes.global.concat(regexScopes.preset, root.isCharacterTavernRegexesEnabled() ? regexScopes.character : []);
        lists.map(normalizeRegex).forEach(function (script) {
            if (!script.enabled) return;
            if (!script.source[source]) return;
            if (!script.destination[destination]) return;
            if (options.isEdit && !script.run_on_edit) return;
            if (typeof options.depth === 'number' && ((typeof script.min_depth === 'number' && options.depth < script.min_depth) || (typeof script.max_depth === 'number' && options.depth > script.max_depth))) return;
            const regex = compileRegex(script.find_regex);
            if (!regex) return;
            output = output.replace(regex, function () {
                let replacement = script.replace_string;
                (script.trim_strings || []).forEach(function (text) { replacement = replacement.split(String(text)).join(''); });
                return replacement.replace(/\\$(\\d+)/g, function (_, index) { return arguments && arguments[Number(index)] || ''; });
            });
        });
        return output;
    };

    function defaultAudioSettings() { return { enabled: true, mode: 'repeat_all', muted: false, volume: 50 }; }
    const audioState = { bgm: [], ambient: [], current: { bgm: null, ambient: null }, settings: { bgm: defaultAudioSettings(), ambient: defaultAudioSettings() } };
    function audioType(value) { return value === 'ambient' ? 'ambient' : 'bgm'; }
    function normalizeAudio(item) { if (!item) return null; const url = String(item.url || item.src || ''); if (!url) return null; const title = String(item.title || url.split('/').pop() || url); return { title: title, url: url }; }
    root.getAudioList = function (type) { return clone(audioState[audioType(type)]); };
    root.replaceAudioList = function (type, list) { audioState[audioType(type)] = (Array.isArray(list) ? list : []).map(normalizeAudio).filter(Boolean); return undefined; };
    root.appendAudioList = function (type, list) {
        const kind = audioType(type);
        (Array.isArray(list) ? list : [list]).map(normalizeAudio).filter(Boolean).forEach(function (item) {
            if (!audioState[kind].some(function (existing) { return existing.title === item.title || existing.url === item.url; })) audioState[kind].push(item);
        });
        return undefined;
    };
    root.getAudioSettings = function (type) { return clone(audioState.settings[audioType(type)]); };
    root.setAudioSettings = function (type, settings) {
        if (settings === undefined && type && typeof type === 'object') { settings = type; type = 'bgm'; }
        const kind = audioType(type);
        Object.assign(audioState.settings[kind], clone(settings || {}));
        audioState.settings[kind].volume = Math.max(0, Math.min(100, Number(audioState.settings[kind].volume) || 0));
        const current = audioState.current[kind];
        if (current && current.element) { current.element.volume = audioState.settings[kind].volume / 100; current.element.muted = audioState.settings[kind].muted; }
        return undefined;
    };
    root.getCurrentAudio = function (type) {
        const current = audioState.current[audioType(type)];
        if (!current) return { src: '', title: '', playing: false, progress: 0 };
        const element = current.element;
        const progress = element && Number.isFinite(element.duration) && element.duration > 0 ? Math.max(0, Math.min(100, element.currentTime / element.duration * 100)) : 0;
        return { src: current.item.url, title: current.item.title, playing: Boolean(element && !element.paused), progress: progress };
    };
    root.playAudio = function (type, audio) {
        if (audio === undefined) { audio = type; type = 'bgm'; }
        const kind = audioType(type);
        const item = normalizeAudio(typeof audio === 'string' ? { url: audio } : (audio || audioState[kind][0]));
        if (!item) return;
        root.appendAudioList(kind, [item]);
        const previous = audioState.current[kind];
        if (previous && previous.element) previous.element.pause();
        const element = new Audio(root.resolveCardAsset(item.url));
        const settings = audioState.settings[kind];
        element.volume = settings.volume / 100;
        element.muted = settings.muted;
        element.loop = settings.mode === 'repeat_one';
        audioState.current[kind] = { item: item, element: element };
        element.play().catch(function (error) { log('warn', 'Audio autoplay was blocked: ' + error.message); });
    };
    root.pauseAudio = function (type) { const current = audioState.current[audioType(type)]; if (current && current.element) current.element.pause(); };
    root.play_audio = function (url) { return root.playAudio('bgm', url); };

'''
t1=t1[:start]+new+t1[end:]

# localforage-compatible IndexedDB implementation, with fallback to the runtime storage shim.
old='''    if (root.localforage) {
        root.localforage.config = function () { return true; };
        root.localforage.getItem = function (key) { const value = root.localStorage.getItem(key); if (value == null) return Promise.resolve(null); try { return Promise.resolve(JSON.parse(value)); } catch (_) { return Promise.resolve(value); } };
        root.localforage.setItem = function (key, value) { root.localStorage.setItem(key, JSON.stringify(value)); return Promise.resolve(value); };
        root.localforage.removeItem = function (key) { root.localStorage.removeItem(key); return Promise.resolve(); };
        root.localforage.clear = function () { root.localStorage.clear(); return Promise.resolve(); };
        root.localforage.keys = function () { const keys = []; for (let i = 0; i < root.localStorage.length; i += 1) keys.push(root.localStorage.key(i)); return Promise.resolve(keys); };
    }'''
new='''    function createLocalForageInstance(config) {
        config = Object.assign({ name: 'card-studio', storeName: 'keyvaluepairs' }, config || {});
        let databasePromise = null;
        function openDatabase() {
            if (!root.indexedDB) return Promise.resolve(null);
            if (databasePromise) return databasePromise;
            databasePromise = new Promise(function (resolve, reject) {
                const request = root.indexedDB.open(String(config.name), 1);
                request.onupgradeneeded = function () { if (!request.result.objectStoreNames.contains(config.storeName)) request.result.createObjectStore(config.storeName); };
                request.onsuccess = function () { resolve(request.result); };
                request.onerror = function () { reject(request.error || new Error('IndexedDB open failed')); };
            }).catch(function () { return null; });
            return databasePromise;
        }
        function transaction(mode, operation) {
            return openDatabase().then(function (database) {
                if (!database) return operation(null);
                return new Promise(function (resolve, reject) {
                    const tx = database.transaction(config.storeName, mode);
                    const store = tx.objectStore(config.storeName);
                    let result;
                    try { result = operation(store, resolve, reject); } catch (error) { reject(error); }
                    tx.onerror = function () { reject(tx.error || new Error('IndexedDB transaction failed')); };
                    if (result !== undefined && !(result && typeof result.onsuccess === 'function')) resolve(result);
                });
            });
        }
        const fallbackPrefix = '__localforage__:' + config.name + ':' + config.storeName + ':';
        const api = {
            config: function (next) { if (next) Object.assign(config, next); return true; },
            ready: function () { return openDatabase().then(function () { return api; }); },
            getItem: function (key) { return transaction('readonly', function (store, resolve) { if (!store) { const raw = root.localStorage.getItem(fallbackPrefix + key); if (raw == null) return null; try { return JSON.parse(raw); } catch (_) { return raw; } } const request = store.get(String(key)); request.onsuccess = function () { resolve(request.result === undefined ? null : request.result); }; }); },
            setItem: function (key, value) { return transaction('readwrite', function (store, resolve) { if (!store) { root.localStorage.setItem(fallbackPrefix + key, JSON.stringify(value)); return value; } const request = store.put(value, String(key)); request.onsuccess = function () { resolve(value); }; }); },
            removeItem: function (key) { return transaction('readwrite', function (store, resolve) { if (!store) { root.localStorage.removeItem(fallbackPrefix + key); return; } const request = store.delete(String(key)); request.onsuccess = function () { resolve(); }; }); },
            clear: function () { return transaction('readwrite', function (store, resolve) { if (!store) { const keys = []; for (let i = 0; i < root.localStorage.length; i += 1) { const key = root.localStorage.key(i); if (key && key.indexOf(fallbackPrefix) === 0) keys.push(key); } keys.forEach(function (key) { root.localStorage.removeItem(key); }); return; } const request = store.clear(); request.onsuccess = function () { resolve(); }; }); },
            keys: function () { return transaction('readonly', function (store, resolve) { if (!store) { const keys = []; for (let i = 0; i < root.localStorage.length; i += 1) { const key = root.localStorage.key(i); if (key && key.indexOf(fallbackPrefix) === 0) keys.push(key.slice(fallbackPrefix.length)); } return keys; } const request = store.getAllKeys(); request.onsuccess = function () { resolve(request.result.map(String)); }; }); },
            length: function () { return api.keys().then(function (keys) { return keys.length; }); },
            key: function (index) { return api.keys().then(function (keys) { return keys[index] === undefined ? null : keys[index]; }); },
            iterate: function (iterator) { return api.keys().then(async function (keys) { for (let i = 0; i < keys.length; i += 1) { const value = await api.getItem(keys[i]); const result = await iterator(value, keys[i], i + 1); if (result !== undefined) return result; } }); },
            createInstance: function (next) { return createLocalForageInstance(Object.assign({}, config, next || {})); },
            driver: function () { return root.indexedDB ? 'asyncStorage' : 'localStorageWrapper'; },
            setDriver: function () { return Promise.resolve(); },
            defineDriver: function () { return Promise.resolve(); }
        };
        return api;
    }
    root.localforage = createLocalForageInstance({ name: 'sillytavern-card-studio', storeName: 'card-runtime' });'''
t1=replace_once(t1,old,new,'localforage')

# Script trees: preserve scopes, folders, enabled state and data; persist through extension settings.
start=t1.index("    root.__registerCardRuntimeScripts = function (scripts) {")
end=t1.index("\n    const Mvu =",start)
old=t1[start:end]
new='''    const scriptTreeScopes = clone(extensionSettings.__cardRuntimeScriptTrees || { global: [], preset: [], character: [] });
    function flattenScripts(trees, output) {
        output = output || [];
        (Array.isArray(trees) ? trees : []).forEach(function (tree) {
            if (!tree) return;
            if (tree.type === 'folder') flattenScripts(tree.scripts, output);
            else if (tree.type === 'script') output.push(tree);
        });
        return output;
    }
    function rebuildCharacterRegistry() {
        scriptRegistry.clear();
        flattenScripts(scriptTreeScopes.character).forEach(function (script, index) {
            const id = String(script.id || 'script-' + index);
            const buttons = script.button && Array.isArray(script.button.buttons) ? script.button.buttons : (Array.isArray(script.buttons) ? script.buttons : []);
            scriptRegistry.set(id, { type: 'script', enabled: script.enabled !== false, id: id, name: String(script.name || id), content: String(script.content || ''), info: String(script.info || ''), buttons: clone(buttons), data: clone(script.data || {}), export_with: clone(script.export_with || { data: true, button: true }) });
        });
    }
    root.__registerCardRuntimeScripts = function (scripts) {
        scriptTreeScopes.character = (Array.isArray(scripts) ? scripts : []).map(function (script, index) {
            const id = String(script && script.id || 'script-' + index);
            const buttons = Array.isArray(script && script.buttons) ? clone(script.buttons) : [];
            return { type: 'script', enabled: script && script.enabled !== false, id: id, name: String(script && script.name || id), content: String(script && script.content || ''), info: String(script && script.info || ''), button: { enabled: buttons.length > 0, buttons: buttons }, data: clone(script && script.data || {}), export_with: clone(script && script.export_with || { data: true, button: true }) };
        });
        rebuildCharacterRegistry();
    };
    root.getScriptId = function () { return activeScriptId; };
    root.getScriptName = function () { return activeScriptName; };
    root.getScriptInfo = function () { return activeScriptInfo; };
    root.getScriptButtons = function () { return clone(activeScriptButtons); };
    root.__setActiveCardScript = function (id, name, info, buttons) {
        activeScriptId = String(id || 'default');
        const registered = scriptRegistry.get(activeScriptId) || {};
        activeScriptName = String(name || registered.name || id || 'default');
        activeScriptInfo = String(info === undefined ? (registered.info || '') : (info || ''));
        activeScriptButtons = Array.isArray(buttons) ? clone(buttons) : clone(registered.buttons || []);
    };
    root.getButtonEvent = function (name) { return 'btn_click_' + name; };
    root.replaceScriptButtons = function (param1, param2) {
        const hasExplicitId = typeof param1 === 'string' && arguments.length > 1;
        const resolvedId = hasExplicitId ? String(param1) : String(activeScriptId || 'default');
        const buttons = hasExplicitId ? param2 : param1;
        const cleanButtons = Array.isArray(buttons) ? clone(buttons) : [];
        const registered = scriptRegistry.get(resolvedId);
        if (registered) registered.buttons = cleanButtons;
        if (resolvedId === activeScriptId) activeScriptButtons = clone(cleanButtons);
        flattenScripts(scriptTreeScopes.character).forEach(function (script) { if (String(script.id) === resolvedId) script.button = { enabled: cleanButtons.length > 0, buttons: clone(cleanButtons) }; });
        root.sendMessageToParent('UPDATE_SCRIPT_BUTTONS', { scriptId: resolvedId, buttons: cleanButtons });
    };
    root.updateScriptButtonsWith = function (updater) {
        updater = requireFunctionCallback('updateScriptButtonsWith', updater);
        const current = root.getScriptButtons();
        const result = updater(current);
        if (result && typeof result.then === 'function') return result.then(function (buttons) { root.replaceScriptButtons(buttons); return root.getScriptButtons(); });
        root.replaceScriptButtons(result);
        return root.getScriptButtons();
    };
    root.appendInexistentScriptButtons = function (param1, param2) {
        const hasExplicitId = typeof param1 === 'string' && arguments.length > 1;
        const resolvedId = hasExplicitId ? String(param1) : String(activeScriptId || 'default');
        const additions = hasExplicitId ? param2 : param1;
        const registered = scriptRegistry.get(resolvedId);
        const current = resolvedId === activeScriptId ? root.getScriptButtons() : clone(registered && registered.buttons || []);
        const next = current.slice();
        (Array.isArray(additions) ? additions : []).forEach(function (button) { if (button && !next.some(function (existing) { return existing && existing.name === button.name; })) next.push(clone(button)); });
        root.replaceScriptButtons(resolvedId, next);
        return next;
    };
    root.replaceScriptInfo = function (info) {
        const cleanInfo = String(info == null ? '' : info);
        activeScriptInfo = cleanInfo;
        const registered = scriptRegistry.get(activeScriptId);
        if (registered) registered.info = cleanInfo;
        flattenScripts(scriptTreeScopes.character).forEach(function (script) { if (String(script.id) === activeScriptId) script.info = cleanInfo; });
    };
    root.getAllEnabledScriptButtons = function () {
        const result = {};
        scriptRegistry.forEach(function (script, scriptId) {
            if (script.enabled === false) return;
            const buttons = (script.buttons || []).filter(function (button) { return button && button.visible !== false; }).map(function (button, index) { return { button_id: scriptId + '--' + index, button_name: String(button.name || '') }; }).filter(function (button) { return Boolean(button.button_name); });
            if (buttons.length) result[scriptId] = buttons;
        });
        return result;
    };
    root.getScriptTrees = function (option) { const type = option && option.type || 'character'; return clone(Array.isArray(scriptTreeScopes[type]) ? scriptTreeScopes[type] : []); };
    root.replaceScriptTrees = function (trees, option) {
        const type = option && option.type || 'character';
        if (!['global','preset','character'].includes(type)) throw new Error('Unknown script-tree scope: ' + type);
        scriptTreeScopes[type] = clone(Array.isArray(trees) ? trees : []);
        extensionSettings.__cardRuntimeScriptTrees = clone(scriptTreeScopes);
        if (type === 'character') rebuildCharacterRegistry();
        rpc('extension.settings.save', { settings: extensionSettings }, 30000).catch(function (error) { log('warn', 'Could not persist script trees: ' + error.message); });
        return root.getScriptTrees(option);
    };
    root.updateScriptTreesWith = function (updater, option) {
        updater = requireFunctionCallback('updateScriptTreesWith', updater);
        const current = root.getScriptTrees(option);
        const result = updater(current);
        if (result && typeof result.then === 'function') return result.then(function (trees) { return root.replaceScriptTrees(trees, option); });
        return root.replaceScriptTrees(result, option);
    };
'''
t1=t1[:start]+new+t1[end:]

# Context derives from boot data instead of hardcoded placeholders.
old="""    const context = {
        chat: buildLegacyChat(), characters: [clone(BOOT.characterCard)], characterId: 0, groups: [], groupId: null,
        name1: BOOT.context.name1, name2: BOOT.context.name2, chatId: BOOT.context.chatId, onlineStatus: 'Connected',
        eventSource: root.eventSource, event_types: root.tavern_events, extensionSettings: extensionSettings,
        powerUserSettings: root.power_user, chatMetadata: {}, worldInfo: worldInfo,"""
new="""    const bootCharacters = BOOT.catalog && Array.isArray(BOOT.catalog.characters) ? BOOT.catalog.characters.map(function (entry) { return clone(entry.card || entry); }) : [clone(BOOT.characterCard)];
    const currentCharacterIndex = Math.max(0, bootCharacters.findIndex(function (entry) { return entry && entry.name === BOOT.context.name2; }));
    const context = {
        chat: buildLegacyChat(), characters: bootCharacters, characterId: currentCharacterIndex, groups: clone(BOOT.catalog && BOOT.catalog.groups || []), groupId: BOOT.context.groupId || null,
        name1: BOOT.context.name1, name2: BOOT.context.name2, chatId: BOOT.context.chatId, onlineStatus: BOOT.context.onlineStatus || 'Connected',
        eventSource: root.eventSource, event_types: root.tavern_events, extensionSettings: extensionSettings,
        powerUserSettings: root.power_user, chatMetadata: clone(BOOT.chatMetadata || {}), worldInfo: worldInfo,"""
t1=replace_once(t1,old,new,'context values')
t1=replace_once(t1,"config: { main_api: 'openai', visual_novel_mode: false },","config: { main_api: BOOT.context.mainApi || 'openai', visual_novel_mode: Boolean(BOOT.context.visualNovelMode) },",'main api context')

# Feature detection: do not install callable no-op stubs.
t0=replace_once(t0,"""    officialContextKeys.forEach(function (key) {
        if (!(key in context)) context[key] = function () { return undefined; };
    });
""","",'remove truthy stubs')

# Extension management is honest: bundled helper is discoverable, unsupported mutations return 501 instead of fake success.
old='''    root.isAdmin = function () { return FULL_COMPATIBILITY_MODE; };
    root.getExtensionType = function (id) { const item = catalog.extensions[String(id)]; return item && item.type || (String(id).includes('JS-Slash-Runner') ? 'global' : null); };
    root.getExtensionInstallationInfo = async function (id) { const item = catalog.extensions[String(id)]; return item ? clone(item) : (String(id).includes('JS-Slash-Runner') ? { id: id, installed: true, enabled: true, type: 'global', version: HELPER_VERSION } : null); };
    root.getExtensionStatus = root.getExtensionInstallationInfo;
    root.isInstalledExtension = function (id) { return Boolean(catalog.extensions[String(id)]) || String(id).includes('JS-Slash-Runner'); };
    root.installExtension = async function (url, type) { const result = await rpc('extension.install', { url: url, extensionType: type }, 120000); catalog.extensions[result.id || String(url)] = clone(result); return responseFromRpc(result); };
    root.uninstallExtension = async function (id) { const result = await rpc('extension.uninstall', { id: id }, 120000); delete catalog.extensions[String(id)]; return responseFromRpc(result); };
    root.reinstallExtension = async function (id) { const result = await rpc('extension.reinstall', { id: id }, 120000); catalog.extensions[String(id)] = clone(result); return responseFromRpc(result); };
    root.updateExtension = async function (id) { const result = await rpc('extension.update', { id: id }, 120000); catalog.extensions[String(id)] = clone(result); return responseFromRpc(result); };'''
new='''    root.isAdmin = function () { return false; };
    function isBundledHelper(id) { return /(?:^|\\/)JS-Slash-Runner$/i.test(String(id || '')); }
    root.getExtensionType = function (id) { const item = catalog.extensions[String(id)]; return item && (item.type === 'global' || item.type === 'local' || item.type === 'system') ? item.type : (isBundledHelper(id) ? 'local' : null); };
    root.getExtensionInstallationInfo = async function (id) {
        const item = catalog.extensions[String(id)];
        if (!item && !isBundledHelper(id)) return null;
        return { current_branch_name: String(item && item.current_branch_name || 'bundled'), current_commit_hash: String(item && item.current_commit_hash || '36d8889a99f1cf09d3d1f8aabd0eba33975dc64d'), is_up_to_date: true, remote_url: String(item && (item.remote_url || item.url) || 'https://github.com/N0VI028/JS-Slash-Runner') };
    };
    root.getExtensionStatus = root.getExtensionInstallationInfo;
    root.isInstalledExtension = function (id) { return Boolean(catalog.extensions[String(id)]) || isBundledHelper(id); };
    function unsupportedExtensionMutation(action) { return async function () { return responseFromRpc({ ok: false, error: action + ' is unavailable in a static Card Studio deployment' }, 501); }; }
    root.installExtension = unsupportedExtensionMutation('Extension installation');
    root.uninstallExtension = unsupportedExtensionMutation('Extension removal');
    root.reinstallExtension = unsupportedExtensionMutation('Extension reinstallation');
    root.updateExtension = unsupportedExtensionMutation('Extension update');'''
t0=replace_once(t0,old,new,'extension management overlay')

# Audio command compatibility in overlay.
t0=t0.replace("root.getAudioSettings();", "root.getAudioSettings(_args && _args.type || 'bgm');")
t0=t0.replace("root.setAudioSettings(settings);", "root.setAudioSettings(_args && _args.type || 'bgm', settings);")

# Save patched templates.
T0.write_text(t0)
T1.write_text(t1)

# Reinsert into the bundle. Locate each String.raw template by exact original extracted content.
bundle=BUNDLE.read_text()
orig0=(ROOT/'official-runtime-extracted.js').read_text()
orig1=(ROOT/'template-1.original.txt').read_text() if (ROOT/'template-1.original.txt').exists() else None
if orig1 is None:
    raise RuntimeError('template-1.original.txt missing')
bundle=replace_once(bundle,orig0,t0,'reinsert template0')
bundle=replace_once(bundle,orig1,t1,'reinsert template1')

# Dependency/version alignment and raw generation duplicate user_input fix.
bundle=bundle.replace('vue@3.5.39','vue@3.5.40').replace('vue-router@5.1.0','vue-router@5.2.0')
bundle=bundle.replace('ejs@3.1.10','ejs@3.1.9')
# Raw prompt used to append user_input even when ordered_prompts already contained it.
old_raw='c=[o.join("\\n\\n"),l,a].filter(Boolean).join("\\n\\n")'
new_raw='c=[o.join("\\n\\n"),l,e.includes("user_input")?"":a].filter(Boolean).join("\\n\\n")'
bundle=replace_once(bundle,old_raw,new_raw,'raw user input duplication')

# Preserve raw chat metadata in imported sessions.
pattern=r'''let n=t\.slice\(0,2e4\)\.map\(\(e,t\)=>\(\{id:String\(e\.id\|\|`imported-\$\{Date\.now\(\)\}-\$\{t\}`\),role:"assistant"===e\.role\|\|"model"===e\.role\|\|!1===e\.is_user\?"model":"system"===e\.role\?"system":"user",content:String\(e\.content\?\?e\.mes\?\?""\),timestamp:Number\(e\.timestamp\|\|Date\.parse\(e\.send_date\)\|\|Date\.now\(\)\)\}\)\)'''
repl='''let n=t.slice(0,2e4).map((e,t)=>({id:String(e.id||`imported-${Date.now()}-${t}`),role:"assistant"===e.role||"model"===e.role||!1===e.is_user?"model":"system"===e.role?"system":"user",content:String(e.content??e.mes??""),timestamp:Number(e.timestamp||Date.parse(e.send_date)||Date.now()),...void 0===e.name?{}:{name:String(e.name)},...void 0===e.is_hidden?void 0!==e.is_system?{is_hidden:!!e.is_system}:{}:{is_hidden:!!e.is_hidden},contextState:xh(e.data||e.variables||{}),extra:{...vh(e.extra)?xh(e.extra):{},__sillyTavernRaw:xh(e)},...Array.isArray(e.swipes)?{swipes:e.swipes.map(String)}:{},...Array.isArray(e.swipe_data)?{swipes_data:xh(e.swipe_data)}:Array.isArray(e.swipes_data)?{swipes_data:xh(e.swipes_data)}:{},...Array.isArray(e.swipes_info)?{swipes_info:xh(e.swipes_info)}:{},...void 0===e.swipe_id?{}:{swipe_id:Math.max(0,Math.trunc(Number(e.swipe_id)||0))},...void 0===e.reasoning?{}:{reasoning:xh(e.reasoning)},...void 0===e.tool_calls?{}:{tool_calls:xh(e.tool_calls)},...void 0===e.attachments?{}:{attachments:xh(e.attachments)}}))'''
bundle=replace_regex_once(bundle,pattern,repl,'raw chat metadata')

BUNDLE.write_text(bundle)
print('patched',BUNDLE,'bytes',BUNDLE.stat().st_size)
