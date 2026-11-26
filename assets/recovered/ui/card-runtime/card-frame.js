import { isFrameMessageOrigin, postFrameMessage } from '../../../m4/runtime/card-runtime/host/rpc-dispatcher.js';

const DEFAULT_CHARACTER_AVATAR = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="100%" height="100%" fill="%23334155"/></svg>';
const DEFAULT_USER_AVATAR = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="100%" height="100%" fill="%23475569"/></svg>';

const LEGACY_FRAME_STYLES = [
  '',
  ':root {',
  '    --bg_color: #0f172a;',
  '    --bg_color_light: #1e293b;',
  '    --smart-theme-body: transparent;',
  '    --smart-theme-chat: #1e293b;',
  '    --smart-theme-entry: #334155;',
  '    --text_color: #e2e8f0;',
  '    --text_color_dim: #94a3b8;',
  '    --mes_text_color: #e2e8f0;',
  '    --block-body: #1e293b;',
  '    --block-border: #334155;',
  '    --smart-theme-shadow: 0 4px 12px rgba(0,0,0,.24);',
  '    --user_mes_color: #e2e8f0;',
  '    --char_mes_color: #e2e8f0;',
  '    --blur-strength: 10px;',
  '    --border-radius: 10px;',
  '}',
  'html, body { min-width: 0; width: 100%; background: transparent !important; }',
  'body {',
  '    color: var(--text_color);',
  '    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;',
  '    margin: 0;',
  '    padding: 0;',
  '    overflow-x: hidden;',
  '    font-size: 14px;',
  '}',
  '* { box-sizing: border-box; }',
  '#sheld { position: fixed; inset: 0; z-index: 0; pointer-events: none; background: transparent center/cover no-repeat; }',
  '#wrapper, #content, #main { position: relative; width: 100%; z-index: 1; }',
  '#chat { position: relative; width: 100%; height: auto; padding: 8px; }',
  '.mes { position: relative; width: 100%; display: flex; flex-direction: column; }',
  '.mes_block { display: flex; align-items: flex-start; max-width: 100%; }',
  '.avatar_container { flex: 0 0 44px; margin-right: 10px; }',
  '.avatar { width: 44px; height: 44px; border-radius: 50%; object-fit: cover; }',
  '.mes_content { flex: 1 1 auto; min-width: 0; max-width: 100%; }',
  '.ch_name { font-weight: 700; margin-bottom: 4px; color: var(--text_color); }',
  '.mes_text { display: block; min-width: 0; color: var(--mes_text_color); overflow-wrap: anywhere; }',
  '.mes_text img, .mes_text video, .mes_text canvas, .mes_text svg { max-width: 100%; height: auto; }',
  '.mes_text pre { max-width: 100%; overflow: auto; }',
  '.mes_text code { background: rgba(0,0,0,.28); padding: 2px 4px; border-radius: 3px; }',
  '#st-loading-overlay { padding: 12px; color: var(--text_color_dim); text-align: center; }',
  '::-webkit-scrollbar { width: 6px; height: 6px; }',
  '::-webkit-scrollbar-track { background: transparent; }',
  '::-webkit-scrollbar-thumb { background: rgba(148,163,184,.35); border-radius: 10px; }',
  'button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible, [tabindex]:focus-visible {',
  '    outline: 2px solid currentColor !important;',
  '    outline-offset: 3px !important;',
  '}',
  '',
].join('\n');

function rewriteMinHeightViewportUnits(htmlText) {
  const hasCssMinHeight = /min-height\s*:\s*[^;{}]*\d+(?:\.\d+)?vh/gi.test(htmlText);
  const hasInlineStyle = /style\s*=\s*(["'])[\s\S]*?min-height\s*:\s*[^;]*?\d+(?:\.\d+)?vh[\s\S]*?\1/gi.test(htmlText);
  const hasScriptMinHeight = /(\.style\.minHeight\s*=\s*(["']))([\s\S]*?vh)(\2)/gi.test(htmlText)
    || /(setProperty\s*\(\s*(["'])min-height\2\s*,\s*(["']))([\s\S]*?vh)(\3\s*\))/gi.test(htmlText);

  if (!hasCssMinHeight && !hasInlineStyle && !hasScriptMinHeight) {
    return htmlText;
  }

  const replaceVhUnits = expression => expression.replace(/(\d+(?:\.\d+)?)vh\b/gi, (fullMatch, numericText) => {
    const parsed = Number.parseFloat(numericText);
    if (!Number.isFinite(parsed)) {
      return fullMatch;
    }
    const viewportVar = 'var(--TH-viewport-height)';
    return parsed === 100 ? viewportVar : `calc(${viewportVar} * ${parsed / 100})`;
  });

  let updated = htmlText;
  updated = updated.replace(
    /(min-height\s*:\s*)([^;{}]*?\d+(?:\.\d+)?vh)(?=\s*[;}])/gi,
    (_full, prefix, valueText) => `${prefix}${replaceVhUnits(valueText)}`,
  );
  updated = updated.replace(
    /(style\s*=\s*(["']))([^"']*?)(\2)/gi,
    (fullMatch, prefix, _quote, body, suffix) => (
      /min-height\s*:\s*[^;]*vh/i.test(body)
        ? `${prefix}${body.replace(
            /(min-height\s*:\s*)([^;]*?\d+(?:\.\d+)?vh)/gi,
            (_inner, propPrefix, propValue) => `${propPrefix}${replaceVhUnits(propValue)}`,
          )}${suffix}`
        : fullMatch
    ),
  );
  updated = updated.replace(
    /(\.style\.minHeight\s*=\s*(["']))([\s\S]*?)(\2)/gi,
    (fullMatch, prefix, _quote, body, suffix) => (
      /\b\d+(?:\.\d+)?vh\b/i.test(body) ? `${prefix}${replaceVhUnits(body)}${suffix}` : fullMatch
    ),
  );
  updated = updated.replace(
    /(setProperty\s*\(\s*(["'])min-height\2\s*,\s*(["']))([\s\S]*?)(\3\s*\))/gi,
    (fullMatch, prefix, _q1, _q2, body, suffix) => (
      /\b\d+(?:\.\d+)?vh\b/i.test(body) ? `${prefix}${replaceVhUnits(body)}${suffix}` : fullMatch
    ),
  );
  return updated;
}

function collectExecutableFrameScripts(helperScripts, inlineScripts, transformScriptContent) {
  const combined = [];

  (helperScripts || []).forEach(scriptEntry => {
    if (scriptEntry.type !== 'script' || !scriptEntry.value?.enabled || !scriptEntry.value.content) {
      return;
    }
    combined.push({
      id: scriptEntry.value.id || `helper-${combined.length}`,
      name: scriptEntry.value.name || scriptEntry.value.id || `TavernHelper ${combined.length + 1}`,
      type: 'module',
      content: transformScriptContent(scriptEntry.value.content.trim()),
      info: scriptEntry.value.info || '',
      buttons: scriptEntry.value.buttons || [],
    });
  });

  inlineScripts.forEach((inlineEntry, index) => {
    const transformedContent = transformScriptContent(String(inlineEntry.content || ''));
    const scriptSrc = inlineEntry.src ? String(inlineEntry.src) : undefined;
    if (!transformedContent.trim() && !scriptSrc) {
      return;
    }
    const isModule = inlineEntry.type === 'module' || /(^|\n)\s*(?:import|export)\s/m.test(transformedContent);
    combined.push({
      id: inlineEntry.id || `inline-${index}`,
      name: inlineEntry.name || (scriptSrc ? `External script: ${scriptSrc}` : `Inline HTML script ${index + 1}`),
      type: isModule ? 'module' : 'classic',
      content: transformedContent || undefined,
      src: scriptSrc,
      async: inlineEntry.async,
      defer: inlineEntry.defer,
      noModule: inlineEntry.noModule,
      crossOrigin: inlineEntry.crossOrigin,
      integrity: inlineEntry.integrity,
      referrerPolicy: inlineEntry.referrerPolicy,
      info: inlineEntry.info,
      buttons: inlineEntry.buttons,
    });
  });

  return combined;
}

function buildEarlyDiagnosticsBootstrapScript(serializeInlineJson, messageIndex, characterId, chatId) {
  return [
    '<script>(function(){',
    '  function send(payload){',
    '    if (window.__cardRuntimeDiagnosticsReady) return;',
    '    try { window.parent.postMessage({ type: \'CARD_RUNTIME_DIAGNOSTIC\', payload: Object.assign({',
    '      id: \'card-early-\' + Date.now() + \'-\' + Math.random().toString(36).slice(2, 8),',
    '      severity: \'error\',',
    '      timestamp: Date.now(),',
    `      messageId: ${serializeInlineJson(messageIndex)},`,
    `      characterId: ${serializeInlineJson(characterId)},`,
    `      chatId: ${serializeInlineJson(chatId)}`,
    '    }, payload) }, \'*\'); } catch (_) {}',
    '  }',
    '  window.addEventListener(\'error\', function(event){',
    '    if (window.__cardRuntimeDiagnosticsReady) return;',
    '    var target = event.target;',
    '    if (target && target !== window && (target.src || target.href)) {',
    '      send({ code: \'CARD_RUNTIME_RESOURCE_LOAD_FAILED\', phase: \'dependency-load\', component: String(target.tagName || \'resource\').toLowerCase(), message: \'Không thể tải tài nguyên trước khi runtime khởi tạo.\', resourceUrl: String(target.src || target.href || \'\'), suggestion: \'Kiểm tra URL/CDN, kết nối mạng và CORS của tài nguyên được ghi trong báo cáo.\' });',
    '      return;',
    '    }',
    '    send({ code: \'CARD_RUNTIME_BOOTSTRAP_FAILED\', phase: \'bootstrap-early\', component: \'runtime-bootstrap\', message: String(event.message || \'Runtime bootstrap failed before diagnostics initialization.\'), stack: event.error && event.error.stack ? String(event.error.stack) : undefined, resourceUrl: event.filename ? String(event.filename) : undefined, suggestion: \'Kiểm tra stack trace và script bootstrap/runtime được tải ngay trước lỗi này.\' });',
    '  }, true);',
    '  window.addEventListener(\'unhandledrejection\', function(event){',
    '    if (window.__cardRuntimeDiagnosticsReady) return;',
    '    var reason = event.reason;',
    '    send({ code: \'CARD_RUNTIME_BOOTSTRAP_FAILED\', phase: \'bootstrap-promise\', component: \'runtime-bootstrap\', message: reason && reason.message ? String(reason.message) : String(reason || \'Bootstrap promise rejected.\'), stack: reason && reason.stack ? String(reason.stack) : undefined, suggestion: \'Kiểm tra Promise bị từ chối trong quá trình khởi tạo runtime hoặc thư viện nền.\' });',
    '  });',
    '})();</script>',
  ].join('\n');
}

export function createCardFrame(react, getDependencies) {
  return react.forwardRef(function CardFrame({
    htmlContent,
    scripts,
    originalContent,
    initialData,
    extensionSettings,
    onLoad,
    characterName = 'Character',
    userPersonaName = 'User',
    characterId = 'stcs-character',
    chatId = 'stcs-chat',
    messageId,
    iframeIndex = 0,
    presetName,
    personaId,
    characterCard,
    worldInfo,
    characterAvatarUrl = '',
    userAvatarUrl = '',
    chatHistory = [],
    embeddedAssets = {},
    runtimeMode = 'active',
    executeScripts = true,
  }, forwardedRef) {
    const {
      buildVariableScopes,
      personaStore,
      getRuntimeEngineMode,
      escapeHtmlAttribute,
      formatCardChatHistory,
      replaceFrameTemplates,
      readScopedFrameStorage,
      buildFrameSmartStateBlock,
      getCompatibilityMode,
      serializeElementAttributes,
      buildCardRuntimeCoreScript,
      buildCardRuntimeRendererScript,
      inspectInitialVariablePipeline,
      normalizeCardRuntimeMarkup,
      compatibilityModeEvent,
      legacyFrameLibrariesHtml,
      react: reactRuntime,
      legacyFrameImportMap,
      presetStore,
      yamlParser,
      characterStore,
      runtimeEngineModeEvent,
      serializeInlineJson,
      lorebookStore,
      officialFrameImportMap,
      officialFrameLibrariesHtml,
      jsxRuntime,
    } = getDependencies();

    const [frameHeight, setFrameHeight] = reactRuntime.useState(840);
    const [compatibilityMode, setCompatibilityMode] = reactRuntime.useState(getCompatibilityMode);
    const [engineMode, setEngineMode] = reactRuntime.useState(getRuntimeEngineMode);
    const iframeRef = reactRuntime.useRef(null);

    const resolvedMessageIndex = Math.max(0, messageId ?? Math.max(0, chatHistory.length - 1));
    const officialFrameId = `TH-message--${resolvedMessageIndex}--${Math.max(0, iframeIndex)}`;
    const resolvedCharacterAvatar = characterAvatarUrl || DEFAULT_CHARACTER_AVATAR;
    const resolvedUserAvatar = userAvatarUrl || DEFAULT_USER_AVATAR;

    const assignIframeRef = reactRuntime.useCallback(node => {
      iframeRef.current = node;
      if (typeof forwardedRef === 'function') {
        forwardedRef(node);
      } else if (forwardedRef) {
        forwardedRef.current = node;
      }
    }, [forwardedRef]);

    reactRuntime.useEffect(() => {
      const handleCompatibilityChange = event => {
        const nextMode = event.detail;
        if (nextMode === 'full' || nextMode === 'safe') {
          setCompatibilityMode(nextMode);
        }
      };
      const handleEngineChange = event => {
        const nextEngine = event.detail;
        if (nextEngine === 'current' || nextEngine === 'official-local') {
          setEngineMode(nextEngine);
        }
      };

      window.addEventListener(compatibilityModeEvent, handleCompatibilityChange);
      window.addEventListener(runtimeEngineModeEvent, handleEngineChange);
      return () => {
        window.removeEventListener(compatibilityModeEvent, handleCompatibilityChange);
        window.removeEventListener(runtimeEngineModeEvent, handleEngineChange);
      };
    }, []);

    reactRuntime.useEffect(() => {
      if (engineMode !== 'official-local') {
        return;
      }
      const syncViewportHeight = () => postFrameMessage(iframeRef.current, {
        type: 'TH_UPDATE_VIEWPORT_HEIGHT',
      });
      window.addEventListener('resize', syncViewportHeight);
      window.visualViewport?.addEventListener('resize', syncViewportHeight);
      syncViewportHeight();
      return () => {
        window.removeEventListener('resize', syncViewportHeight);
        window.visualViewport?.removeEventListener('resize', syncViewportHeight);
      };
    }, [engineMode]);

    const scopeContext = reactRuntime.useMemo(() => ({
      chatId,
      characterId,
      presetName,
      messageId: resolvedMessageIndex,
    }), [chatId, characterId, presetName, resolvedMessageIndex]);

    const runtimeSnapshot = reactRuntime.useMemo(() => {
      const variableScopes = buildVariableScopes(
        initialData || {},
        chatHistory,
        scopeContext,
        scripts,
        characterCard,
        originalContent,
      );
      const variableDiagnostics = inspectInitialVariablePipeline({
        baseVariables: initialData || {},
        card: characterCard,
        messages: chatHistory,
        messageId: resolvedMessageIndex,
        variableScopes,
        worldInfo: worldInfo || characterCard?.char_book?.entries || [],
        originalContent,
        parseStructured: text => yamlParser.default.parse(text),
      });
      return {
        chatHistory: formatCardChatHistory(chatHistory, userPersonaName, characterName, true),
        variableScopes,
        variableDiagnostics,
        extensionSettings: extensionSettings || {},
        worldInfo: worldInfo || characterCard?.char_book?.entries || [],
      };
    }, [
      chatHistory,
      userPersonaName,
      characterName,
      initialData,
      scopeContext,
      scripts,
      extensionSettings,
      worldInfo,
      characterCard,
      resolvedMessageIndex,
      originalContent,
    ]);

    const frameIdentityKey = reactRuntime.useMemo(
      () => [
        chatId,
        resolvedMessageIndex,
        iframeIndex,
        characterId,
        compatibilityMode,
        engineMode,
        htmlContent,
        scripts.map(item => `${item.value?.id}:${item.value?.enabled}:${item.value?.content}`).join('|'),
      ].join('\0'),
      [
        chatId,
        resolvedMessageIndex,
        iframeIndex,
        characterId,
        compatibilityMode,
        engineMode,
        htmlContent,
        scripts,
      ],
    );

    const frameSnapshotRef = reactRuntime.useRef({
      identity: frameIdentityKey,
      snapshot: runtimeSnapshot,
      scopeContext,
      card: characterCard,
      historyLength: chatHistory.length,
    });
    if (frameSnapshotRef.current.identity !== frameIdentityKey) {
      frameSnapshotRef.current = {
        identity: frameIdentityKey,
        snapshot: runtimeSnapshot,
        scopeContext,
        card: characterCard,
        historyLength: chatHistory.length,
      };
    }

    reactRuntime.useEffect(() => {
      const handleFrameMessage = event => {
        const frameWindow = iframeRef.current?.contentWindow;
        if (
          !frameWindow
          || event.source !== frameWindow
          || !event.data
          || !isFrameMessageOrigin(iframeRef.current, event.origin, window.location.origin)
        ) {
          return;
        }
        if (event.data.type === 'CARD_STUDIO_IFRAME_RESIZE') {
          const requestedHeight = Number(event.data.height);
          if (Number.isFinite(requestedHeight) && requestedHeight > 0) {
            const maxHeight = compatibilityMode === 'full' ? 1000000 : 12000;
            const clampedHeight = Math.min(maxHeight, Math.ceil(requestedHeight));
            setFrameHeight(previous => (Math.abs(previous - clampedHeight) < 5 ? previous : clampedHeight));
          }
          return;
        }
        if (event.data.type === 'HANDSHAKE_INIT') {
          postFrameMessage(iframeRef.current, {
            type: 'HANDSHAKE_ACK',
            payload: runtimeSnapshot,
          });
        }
      };

      window.addEventListener('message', handleFrameMessage);
      return () => window.removeEventListener('message', handleFrameMessage);
    }, [runtimeSnapshot, compatibilityMode]);

    const compiledDocumentHtml = reactRuntime.useMemo(() => {
      const activeSnapshot = frameSnapshotRef.current;
      const assetMap = { ...embeddedAssets };
      if (characterAvatarUrl) {
        assetMap['ccdefault:'] = characterAvatarUrl;
      }

      const templateBindings = {
        ...assetMap,
        '{{char}}': characterName,
        '{{user}}': userPersonaName,
        '{{user_avatar}}': resolvedUserAvatar,
        '{{char_avatar}}': resolvedCharacterAvatar,
        '{{charId}}': characterId,
        '{{lastMessageId}}': String(Math.max(0, activeSnapshot.historyLength - 1)),
        '{{messageId}}': String(resolvedMessageIndex),
        '{{is_group}}': 'false',
      };

      const unwrappedHtml = replaceFrameTemplates(htmlContent, templateBindings)
        .replace(/```(?:text|html|xml|javascript|js)?\s*([\s\S]*?)\s*```/gi, '$1')
        .trim();
      const viewportNormalizedHtml = engineMode === 'official-local'
        ? rewriteMinHeightViewportUnits(unwrappedHtml)
        : unwrappedHtml;

      const parsedDoc = new DOMParser().parseFromString(viewportNormalizedHtml, 'text/html');
      const htmlAttributes = serializeElementAttributes(parsedDoc.documentElement);
      const bodyAttributes = serializeElementAttributes(parsedDoc.body);

      const baseTag = parsedDoc.head.querySelector('base[href]');
      const baseTagHtml = baseTag ? baseTag.outerHTML : '';
      baseTag?.remove();

      const extractedStylesHtml = Array.from(parsedDoc.querySelectorAll('style'))
        .map(node => node.outerHTML)
        .join('\n');
      parsedDoc.querySelectorAll('style').forEach(node => node.remove());

      const earlyDiagnostics = [];
      const librariesHtml = engineMode === 'official-local'
        ? officialFrameLibrariesHtml
        : legacyFrameLibrariesHtml;
      const importMap = {
        imports: {
          ...(engineMode === 'official-local' ? officialFrameImportMap : legacyFrameImportMap),
        },
        scopes: {},
      };

      Array.from(
        parsedDoc.querySelectorAll('script[type="importmap"], script[type="importmap-shim"]'),
      ).forEach(node => {
        try {
          const parsedImportMap = JSON.parse(node.textContent || '{}');
          if (parsedImportMap?.imports && typeof parsedImportMap.imports === 'object') {
            Object.assign(importMap.imports, parsedImportMap.imports);
          }
          if (parsedImportMap?.scopes && typeof parsedImportMap.scopes === 'object') {
            Object.assign(importMap.scopes, parsedImportMap.scopes);
          }
        } catch (error) {
          earlyDiagnostics.push({
            code: 'CARD_RUNTIME_IMPORTMAP_INVALID',
            phase: 'html-prepare',
            component: 'InteractiveHtmlMessage',
            message: error instanceof Error ? error.message : 'Import map JSON không hợp lệ.',
          });
        }
        node.remove();
      });

      const importMapScriptTag = `<script type="importmap">${serializeInlineJson(importMap)}</script>`;
      const executableScriptNodes = Array.from(parsedDoc.querySelectorAll('script')).filter(node => {
        const scriptType = node.type.trim().toLowerCase();
        return !scriptType || [
          'module',
          'text/javascript',
          'application/javascript',
          'text/ecmascript',
          'application/ecmascript',
        ].includes(scriptType);
      });

      const inlineScripts = executableScriptNodes.map((node, index) => ({
        id: node.id || `html-script-${index}`,
        name: node.src ? `External HTML script ${index + 1}` : `Inline HTML script ${index + 1}`,
        type: node.type === 'module' ? 'module' : 'classic',
        content: node.textContent || '',
        src: node.src ? replaceFrameTemplates(node.getAttribute('src') || node.src, templateBindings) : undefined,
        async: node.async,
        defer: node.defer,
        noModule: node.noModule,
        crossOrigin: node.crossOrigin || undefined,
        integrity: node.integrity || undefined,
        referrerPolicy: node.referrerPolicy || undefined,
      }));
      executableScriptNodes.forEach(node => node.remove());

      const headResourcesHtml = [
        ...Array.from(parsedDoc.head.querySelectorAll('link[rel="stylesheet"], meta[name], meta[property]')),
        ...Array.from(parsedDoc.head.querySelectorAll('script')),
      ].map(node => node.outerHTML).join('\n');
      parsedDoc.head.querySelectorAll('*').forEach(node => node.remove());

      const bodyMarkupHtml = parsedDoc.body.innerHTML;
      const preparedScripts = collectExecutableFrameScripts(scripts, inlineScripts, rawScript => {
        const expanded = replaceFrameTemplates(rawScript, templateBindings);
        if (compatibilityMode === 'full') {
          return expanded;
        }
        return expanded
          .replace(/(?:window\.)?(?:parent|top)\.document/g, 'window.__st_parent_mock')
          .replace(/(?:window\.)?(?:parent|top)\.SillyTavern/g, 'window.SillyTavern')
          .replace(/(?:window\.)?(?:parent|top)\.TavernHelper/g, 'window.TavernHelper')
          .replace(/(?:window\.)?(?:parent|top)\.\$/g, 'window.$');
      });

      const coreRuntimeScript = buildCardRuntimeCoreScript({
        context: {
          characterId: 0,
          characterKey: characterId,
          chatId,
          messageId: resolvedMessageIndex,
          ...(engineMode === 'official-local' ? { iframeIndex } : {}),
          name1: userPersonaName,
          name2: characterName,
          groupId: null,
          isGroup: false,
          presetName,
          personaId,
          compatibilityMode,
          engineMode,
        },
        characterCard: activeSnapshot.card || {
          name: characterName,
          description: '',
          first_mes: '',
          mes_example: '',
        },
        chatHistory: activeSnapshot.snapshot.chatHistory,
        variableScopes: activeSnapshot.snapshot.variableScopes,
        variableDiagnostics: activeSnapshot.snapshot.variableDiagnostics,
        extensionSettings: activeSnapshot.snapshot.extensionSettings,
        worldInfo: activeSnapshot.snapshot.worldInfo,
        lorebookNames: Array.from(new Set([
          ...(activeSnapshot.card?.char_book ? [activeSnapshot.card.char_book.name || characterName] : []),
          ...lorebookStore.getState().lorebooks.map(book => book.name),
        ])),
        storage: {
          local: readScopedFrameStorage('local', activeSnapshot.scopeContext),
          session: readScopedFrameStorage('session', activeSnapshot.scopeContext),
        },
        embeddedAssets: assetMap,
        userAvatar: resolvedUserAvatar,
        characterAvatar: resolvedCharacterAvatar,
        originalContent,
        smartStateBlock: buildFrameSmartStateBlock(
          initialData || {},
          activeSnapshot.card,
          chatHistory,
          resolvedMessageIndex,
        ),
        catalog: {
          characters: characterStore.getState().characters.map(character => ({
            fileName: character.fileName,
            name: character.card.name,
            avatar: character.avatarUrl || character.fileName,
            avatarUrl: character.avatarUrl,
            card: character.card,
            current: character.fileName === characterStore.getState().activeCharacterFileName,
          })),
          personas: personaStore.getState().personas.map(persona => ({
            ...persona,
            current: persona.id === personaStore.getState().activePersonaId,
          })),
          presets: presetStore.getState().presets.map(preset => ({
            ...preset,
            current: preset.name === presetStore.getState().activePresetName,
          })),
          extensions: activeSnapshot.snapshot.extensionSettings?.__cardRuntimeExtensions || {
            'third-party/JS-Slash-Runner': {
              id: 'third-party/JS-Slash-Runner',
              installed: true,
              enabled: true,
              type: 'third-party',
              version: '4.8.19',
            },
          },
        },
      });

      const earlyErrorBootstrap = buildEarlyDiagnosticsBootstrapScript(
        serializeInlineJson,
        resolvedMessageIndex,
        characterId,
        chatId,
      );
      const earlyDiagnosticCalls = earlyDiagnostics
        .map(diag => (
          `window._cardStudio?.diagnostic(${serializeInlineJson(diag.code)}, `
          + `${serializeInlineJson(diag.phase)}, ${serializeInlineJson(diag.component)}, `
          + `${serializeInlineJson(diag.message)}, ${serializeInlineJson(diag.details || {})});`
        ))
        .join('');
      const rendererScript = buildCardRuntimeRendererScript(bodyMarkupHtml, preparedScripts, {
        executeScripts,
        runtimeMode,
      });

      const legacyMessageShell = [
        '',
        '            <div id="chat">',
        `                <div class="mes chat_msg" id="message-${resolvedMessageIndex}" mesid="${resolvedMessageIndex}" data-message-id="${resolvedMessageIndex}">`,
        '                    <div class="mes_block">',
        `                        <div class="avatar_container"><img src="${escapeHtmlAttribute(resolvedCharacterAvatar)}" class="avatar" alt=""></div>`,
        '                        <div class="mes_content">',
        `                            <div class="ch_name">${escapeHtmlAttribute(characterName)}</div>`,
        '                            <div class="mes_text" id="target_mes_text"><div id="st-loading-overlay">Đang khởi tạo môi trường thẻ…</div></div>',
        '                        </div>',
        '                    </div>',
        '                </div>',
        '            </div>',
      ].join('\n');

      const bodyShellHtml = engineMode === 'official-local'
        ? '<div id="st-loading-overlay">Đang khởi tạo môi trường thẻ…</div>'
        : `<div id="sheld"></div><div id="wrapper"><div id="content"><main id="main">${legacyMessageShell}</main></div></div>`;

      const officialStyles = [
        '',
        '*,*::before,*::after{box-sizing:border-box;}',
        'html,body{margin:0!important;padding:0;overflow:hidden!important;max-width:100%!important;}',
        `.user_avatar,.user-avatar{background-image:url(${JSON.stringify(resolvedUserAvatar)})}`
          + `.char_avatar,.char-avatar{background-image:url(${JSON.stringify(resolvedCharacterAvatar)})}`
          + '#st-loading-overlay{padding:12px;text-align:center;color:#94a3b8}',
      ].join('\n');

      const baseStyleCss = engineMode === 'official-local' ? officialStyles : LEGACY_FRAME_STYLES;

      return `<!doctype html><html${htmlAttributes}><head>`
        + '<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
        + baseTagHtml
        + earlyErrorBootstrap
        + importMapScriptTag
        + librariesHtml
        + headResourcesHtml
        + `<style>${baseStyleCss}</style>`
        + extractedStylesHtml
        + `<script>${coreRuntimeScript}</script><script>${earlyDiagnosticCalls}</script></head>`
        + `<body${bodyAttributes}>${bodyShellHtml}<script>${rendererScript}</script></body></html>`;
    }, [
      frameIdentityKey,
      embeddedAssets,
      characterAvatarUrl,
      characterName,
      userPersonaName,
      resolvedUserAvatar,
      resolvedCharacterAvatar,
      characterId,
      resolvedMessageIndex,
      iframeIndex,
      htmlContent,
      scripts,
      chatId,
      presetName,
      personaId,
      compatibilityMode,
      originalContent,
      executeScripts,
      runtimeMode,
    ]);

    return jsxRuntime.jsx('iframe', {
      ref: assignIframeRef,
      id: engineMode === 'official-local' ? officialFrameId : undefined,
      name: engineMode === 'official-local' ? officialFrameId : undefined,
      loading: engineMode === 'official-local' ? 'lazy' : undefined,
      frameBorder: engineMode === 'official-local' ? '0' : undefined,
      'data-card-studio-iframe': 'true',
      'data-card-runtime-active': runtimeMode === 'active' ? 'true' : 'false',
      'data-card-runtime-engine': engineMode,
      'data-card-message-id': resolvedMessageIndex,
      srcDoc: normalizeCardRuntimeMarkup(compiledDocumentHtml),
      style: {
        width: '100%',
        minWidth: '280px',
        height: `${frameHeight}px`,
        border: 'none',
        backgroundColor: 'transparent',
        overflow: 'hidden',
      },
      sandbox: compatibilityMode === 'safe'
        ? 'allow-scripts allow-modals allow-popups allow-forms allow-pointer-lock allow-downloads'
        : undefined,
      title: `Thẻ tương tác của ${characterName}`,
      onLoad,
    });
  });
}
