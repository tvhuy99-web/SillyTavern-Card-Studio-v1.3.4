import { isFrameMessageOrigin, postFrameMessage } from '../../../runtime/card-runtime/host/rpc-dispatcher.js';

// Recovered application UI. The existing React instance and feature dependencies are injected.
// Semantic dependency contract: callers inject named dependencies directly.

const THINKING_TAG_LABELS = {
  thinking_requirements: 'Yêu cầu Suy nghĩ',
  step_outline: 'Dàn ý Bước đi',
  plan: 'Kế hoạch',
  inner_monologue: 'Suy nghĩ nội tâm',
  basic_confirmation: 'Xác nhận cơ bản',
  draft: 'Bản nháp',
  revision_confirmation: 'Xác nhận chỉnh sửa',
  draft_unit_plan: 'Kế hoạch đơn vị',
};

const THINKING_BLOCK_RE = /<(thinking|thinking_requirements|step_outline|plan|inner_monologue|basic_confirmation|draft|revision_confirmation|draft_unit_plan)>([\s\S]*?)<\/\1>/gi;

const MARKDOWN_SANITIZE_OPTIONS = {
  ADD_TAGS: ['details', 'summary'],
  ADD_ATTR: ['class', 'open'],
  FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed'],
  FORBID_ATTR: ['style', 'srcdoc'],
};

const DEFAULT_CHARACTER_AVATAR = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="100%" height="100%" fill="%23334155"/></svg>';
const DEFAULT_USER_AVATAR = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect width="100%" height="100%" fill="%23475569"/></svg>';

const PREVIEW_BASE_STYLES = [
  '',
  '            html,body{margin:0;padding:0;min-width:0;background:transparent;color:#e2e8f0;font-family:system-ui,sans-serif;overflow-x:hidden}',
  '            *{box-sizing:border-box} img,video,canvas,svg{max-width:100%;height:auto}',
  '            button,input,select,textarea,a,[tabindex]{outline-offset:3px}',
  '            button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,a:focus-visible,[tabindex]:focus-visible{outline:2px solid currentColor}',
  '        ',
].join('\n');

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

function resolveDependencies(getDependencies) {
  const deps = getDependencies();
  return {
    react: deps.react,
    jsxRuntime: deps.jsxRuntime,
    liveStreamStore: deps.liveStreamStore,
    LiveStreamText: deps.LiveStreamText,
    markdownParser: deps.markdownParser,
    htmlSanitizer: deps.htmlSanitizer,
    ThinkingBlock: deps.ThinkingBlock,
    ArenaResponseSide: deps.ArenaResponseSide,
    ArenaResponsePanel: deps.ArenaResponsePanel,
    arenaState: deps.arenaState,
    extractStoryContent: deps.extractStoryContent,
    useToast: deps.useToast,
    Icon: deps.Icon,
    useSpeech: deps.useSpeech,
    personaStore: deps.personaStore,
    presetStore: deps.presetStore,
    characterStore: deps.characterStore,
    lorebookStore: deps.lorebookStore,
    MessageActionMenu: deps.MessageActionMenu,
    StreamingHtmlPreview: deps.StreamingHtmlPreview,
    CardFrame: deps.CardFrame,
    ChatMessage: deps.ChatMessage,
    ReadAloudButton: deps.ReadAloudButton,
    LoadingIndicator: deps.LoadingIndicator,
    StreamingThinkingPanel: deps.StreamingThinkingPanel,
    getCompatibilityMode: deps.getCompatibilityMode,
    getRuntimeEngineMode: deps.getRuntimeEngineMode,
    compatibilityModeEvent: deps.compatibilityModeEvent,
    runtimeEngineModeEvent: deps.runtimeEngineModeEvent,
    buildVariableScopes: deps.buildVariableScopes,
    formatCardChatHistory: deps.formatCardChatHistory,
    inspectInitialVariablePipeline: deps.inspectInitialVariablePipeline,
    yamlParser: deps.yamlParser,
    replaceFrameTemplates: deps.replaceFrameTemplates,
    serializeElementAttributes: deps.serializeElementAttributes,
    escapeHtmlAttribute: deps.escapeHtmlAttribute,
    serializeInlineJson: deps.serializeInlineJson,
    readScopedFrameStorage: deps.readScopedFrameStorage,
    buildFrameSmartStateBlock: deps.buildFrameSmartStateBlock,
    officialFrameImportMap: deps.officialFrameImportMap,
    legacyFrameImportMap: deps.legacyFrameImportMap,
    officialFrameLibrariesHtml: deps.officialFrameLibrariesHtml,
    legacyFrameLibrariesHtml: deps.legacyFrameLibrariesHtml,
    buildCardRuntimeCoreScript: deps.buildCardRuntimeCoreScript,
    buildCardRuntimeRendererScript: deps.buildCardRuntimeRendererScript,
    normalizeCardRuntimeMarkup: deps.normalizeCardRuntimeMarkup,
    ChatDialogs: deps.ChatDialogs,
    ActionSuggestionDialog: deps.ActionSuggestionDialog,
    VariableHud: deps.VariableHud,
    RpgHud: deps.RpgHud,
    CardPreviewDialog: deps.CardPreviewDialog,
    InteractiveErrorDialog: deps.InteractiveErrorDialog,
  };
}

function buildSanitizedPreviewHtml(rawHtml) {
  try {
    const parsedDoc = new DOMParser().parseFromString(rawHtml, 'text/html');
    parsedDoc.querySelectorAll('script').forEach(node => node.remove());
    parsedDoc.querySelectorAll('[autofocus]').forEach(node => node.removeAttribute('autofocus'));
    parsedDoc.querySelectorAll('[onclick]').forEach(node => node.removeAttribute('onclick'));
    const styleEl = parsedDoc.createElement('style');
    styleEl.textContent = PREVIEW_BASE_STYLES;
    parsedDoc.head.appendChild(styleEl);
    return `<!doctype html>${parsedDoc.documentElement.outerHTML}`;
  } catch (error) {
    const safeError = (error instanceof Error ? error.message : String(error)).replace(/[<>&]/g, '');
    return `<!doctype html><html><body><p>Đang nhận giao diện HTML…</p><pre>${safeError}</pre></body></html>`;
  }
}

function extractThinkingBlocksAndCleanText(rawContent, includePipelineBlocks) {
  const thinkingBlocks = [];
  const matcher = new RegExp(THINKING_BLOCK_RE.source, THINKING_BLOCK_RE.flags);
  let remainingText = rawContent;
  let match;

  while ((match = matcher.exec(rawContent)) !== null) {
    const tagName = match[1].toLowerCase();
    const blockBody = match[2].trim();
    const label = THINKING_TAG_LABELS[tagName] || 'Suy nghĩ';
    if (includePipelineBlocks) {
      thinkingBlocks.push({ label, content: blockBody });
    }
    remainingText = remainingText.replace(match[0], '');
  }

  return { thinkingBlocks, remainingText };
}

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

function areMenuActionsEqual(previousActions, nextActions) {
  if (previousActions.length !== nextActions.length) {
    return false;
  }
  for (let index = 0; index < previousActions.length; index += 1) {
    if (
      previousActions[index].label !== nextActions[index].label
      || previousActions[index].disabled !== nextActions[index].disabled
    ) {
      return false;
    }
  }
  return true;
}

export function createStreamingHtmlPreview(getDependencies) {
  return function StreamingHtmlPreview({ htmlContent, characterName }) {
    const { react, jsxRuntime } = resolveDependencies(getDependencies);
    const sanitizedSrcDoc = react.useMemo(
      () => buildSanitizedPreviewHtml(htmlContent),
      [htmlContent],
    );

    return jsxRuntime.jsxs('div', {
      className: 'border border-slate-700/50 rounded-lg overflow-hidden bg-slate-900/30',
      children: [
        jsxRuntime.jsx('div', {
          className: 'px-3 py-1.5 text-xs text-slate-400 border-b border-slate-700/50',
          'aria-live': 'polite',
          children: 'Đang dựng trước giao diện HTML. Script tương tác sẽ chỉ khởi chạy sau khi phản hồi hoàn tất.',
        }),
        jsxRuntime.jsx('iframe', {
          srcDoc: sanitizedSrcDoc,
          title: `Bản xem trước HTML đang tạo của ${characterName}`,
          sandbox: 'allow-forms',
          className: 'w-full border-0 bg-transparent',
          style: { minHeight: 280, height: 520 },
        }),
      ],
    });
  };
}

export function createLiveStreamText(getDependencies) {
  return function LiveStreamText({ messageId, slot = 'main', fallback = '' }) {
    const { liveStreamStore, react, jsxRuntime } = resolveDependencies(getDependencies);
    const [streamSnapshot, setStreamSnapshot] = react.useState(
      () => liveStreamStore.getSnapshot(messageId, slot),
    );

    react.useEffect(
      () => liveStreamStore.subscribe(
        messageId,
        slot,
        () => setStreamSnapshot(liveStreamStore.getSnapshot(messageId, slot)),
      ),
      [messageId, slot],
    );

    return jsxRuntime.jsxs('div', {
      className: 'whitespace-pre-wrap font-sans text-sm leading-relaxed',
      children: [
        streamSnapshot.content || fallback,
        jsxRuntime.jsx('span', {
          className: ' text-sky-400',
          children: '▍',
        }),
      ],
    });
  };
}

export function createStreamingThinkingPanel(getDependencies) {
  return function StreamingThinkingPanel({
    content,
    isStreaming,
    messageId,
    slot = 'main',
  }) {
    const {
      markdownParser,
      ThinkingBlock,
      htmlSanitizer,
      LiveStreamText,
      react,
      jsxRuntime,
    } = resolveDependencies(getDependencies);

    if (isStreaming) {
      return jsxRuntime.jsx(LiveStreamText, {
        messageId,
        slot,
        fallback: content,
      });
    }

    const { mainHtml, thinkingBlocks } = react.useMemo(() => {
      if (!content) {
        return { mainHtml: '', thinkingBlocks: [] };
      }
      const { thinkingBlocks: blocks, remainingText } = extractThinkingBlocksAndCleanText(content, true);
      const parsedHtml = markdownParser.parse(remainingText.trim());
      return {
        mainHtml: htmlSanitizer.sanitize(parsedHtml, MARKDOWN_SANITIZE_OPTIONS),
        thinkingBlocks: blocks,
      };
    }, [content]);

    if (!content) {
      return jsxRuntime.jsx('span', {
        className: ' opacity-50',
        children: 'Đang khởi tạo...',
      });
    }

    return jsxRuntime.jsxs(jsxRuntime.Fragment, {
      children: [
        thinkingBlocks.map((block, index) => jsxRuntime.jsx(ThinkingBlock, {
          content: block.content,
          label: block.label,
        }, index)),
        jsxRuntime.jsx('div', {
          className: 'markdown-content',
          dangerouslySetInnerHTML: { __html: mainHtml },
        }),
      ],
    });
  };
}

export function createArenaResponsePanel(getDependencies) {
  return function ArenaResponsePanel({ message, onSelect, onRetry }) {
    const { ArenaResponseSide, jsxRuntime } = resolveDependencies(getDependencies);
    if (!message.arena) {
      return null;
    }

    return jsxRuntime.jsxs('div', {
      className: 'w-full max-w-4xl mx-auto my-4',
      children: [
        jsxRuntime.jsx('div', {
          className: 'flex items-center justify-center mb-2',
          children: jsxRuntime.jsx('span', {
            className: 'bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm ',
            children: 'ARENA MODE',
          }),
        }),
        jsxRuntime.jsxs('div', {
          className: 'flex flex-col sm:flex-row gap-3',
          children: [
            jsxRuntime.jsx(ArenaResponseSide, {
              modelData: message.arena.modelA,
              selection: 'A',
              colorClass: 'bg-sky-600 text-white',
              onSelect,
              onRetry,
              messageId: message.id,
            }),
            jsxRuntime.jsx('div', {
              className: 'hidden sm:flex items-center justify-center text-slate-500 font-bold text-xs',
              children: 'VS',
            }),
            jsxRuntime.jsx(ArenaResponseSide, {
              modelData: message.arena.modelB,
              selection: 'B',
              colorClass: 'bg-purple-600 text-white',
              onSelect,
              onRetry,
              messageId: message.id,
            }),
          ],
        }),
      ],
    });
  };
}

export function createReadAloudButton(getDependencies) {
  return function ReadAloudButton({
    rawContent,
    voice,
    provider,
    rate,
    pitch,
    nativeVoice,
  }) {
    const {
      extractStoryContent,
      useToast,
      Icon,
      useSpeech,
      jsxRuntime,
    } = resolveDependencies(getDependencies);
    const { showToast } = useToast();
    const { playImmediately } = useSpeech();

    const handleReadAloud = async () => {
      const cleanText = extractStoryContent(rawContent).replace(/<[^>]*>/g, '');
      if (!cleanText.trim()) {
        showToast('Không có nội dung văn bản để đọc.', 'warning');
        return;
      }
      try {
        playImmediately(
          cleanText,
          provider === 'native' ? nativeVoice : voice,
          `interactive-${Date.now()}`,
          { provider, rate, pitch },
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        showToast(`TTS Error: ${errorMessage}`, 'error');
      }
    };

    return jsxRuntime.jsx('button', {
      onClick: handleReadAloud,
      className: 'p-1.5 rounded-full shadow-lg border    bg-slate-800/90 text-slate-400 hover:text-sky-400 hover:border-sky-500 ',
      title: 'Đọc nội dung (TTS)',
      'aria-label': 'Đọc nội dung (TTS)',
      children: jsxRuntime.jsx(Icon, {
        name: 'volume',
        className: 'h-4 w-4',
      }),
    });
  };
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
    } = resolveDependencies(getDependencies);

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

export function createArenaResponseSide(react, getDependencies) {
  return react.memo(
    function ArenaResponseSide({
      modelData,
      selection,
      colorClass,
      onSelect,
      onRetry,
      messageId,
    }) {
      const {
        StreamingThinkingPanel,
        arenaState,
        Icon,
        jsxRuntime,
      } = resolveDependencies(getDependencies);

      const status = arenaState.sideStatus(modelData);
      const isPending = status === 'pending';
      const selectable = arenaState.canSelect(modelData);

      let selectButtonLabel = 'Không thể chọn — trống';
      if (isPending) {
        selectButtonLabel = 'Đang tạo...';
      } else if (status === 'error') {
        selectButtonLabel = 'Không thể chọn — bị lỗi';
      } else if (status === 'stopped') {
        selectButtonLabel = 'Đã dừng — thử lại';
      } else if (selectable) {
        selectButtonLabel = 'Chọn cái này';
      }

      return jsxRuntime.jsxs('div', {
        className: 'flex-1 flex flex-col min-w-0 bg-slate-900/40 rounded-lg border border-slate-700/50 overflow-hidden',
        children: [
          jsxRuntime.jsxs('div', {
            className: `px-3 py-2 text-xs font-bold uppercase tracking-wider border-b border-slate-700/50 flex justify-between items-center ${colorClass} bg-opacity-10`,
            children: [
              jsxRuntime.jsx('span', {
                className: 'truncate max-w-[120px]',
                title: modelData.name,
                children: modelData.name,
              }),
              jsxRuntime.jsxs('div', {
                className: 'flex items-center gap-2',
                children: [
                  selection === 'B' && jsxRuntime.jsx('span', {
                    className: 'text-[10px] opacity-70',
                    children: 'Challenger',
                  }),
                  jsxRuntime.jsx('button', {
                    onClick: () => onRetry(selection),
                    disabled: isPending,
                    className: 'p-1 hover:bg-white/10 rounded  disabled:opacity-50',
                    title: 'Thử lại model này',
                    'aria-label': 'Thử lại model này',
                    children: jsxRuntime.jsx(Icon, {
                      name: 'refresh',
                      className: 'h-4 w-4',
                    }),
                  }),
                ],
              }),
            ],
          }),
          jsxRuntime.jsx('div', {
            className: 'p-3 text-sm text-slate-300 leading-relaxed flex-grow overflow-y-auto max-h-[400px] custom-scrollbar',
            children: jsxRuntime.jsx(StreamingThinkingPanel, {
              content: modelData.content,
              isStreaming: isPending,
              messageId,
              slot: selection,
            }),
          }),
          jsxRuntime.jsx('div', {
            className: 'p-2 border-t border-slate-700/50 bg-slate-800/30',
            children: jsxRuntime.jsx('button', {
              onClick: () => onSelect(selection),
              disabled: !selectable,
              className: `w-full py-1.5 rounded text-xs font-bold  active:scale-95 ${colorClass} hover:brightness-110 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed`,
              children: selectButtonLabel,
            }),
          }),
        ],
      });
    },
    (prevProps, nextProps) => (
      prevProps.modelData.content === nextProps.modelData.content
      && prevProps.modelData.completed === nextProps.modelData.completed
      && prevProps.modelData.status === nextProps.modelData.status
      && prevProps.modelData.name === nextProps.modelData.name
      && prevProps.selection === nextProps.selection
    ),
  );
}

export function createChatMessage(react, getDependencies) {
  return react.memo(
    function ChatMessage({
      message,
      avatarUrl,
      isEditing,
      editingContent,
      onContentChange,
      onSave,
      onCancel,
      menuActions,
      isStreaming = false,
      onArenaSelect,
      onArenaRetry,
      showPipeline = false,
    }) {
      const {
        personaStore,
        markdownParser,
        ThinkingBlock,
        MessageActionMenu,
        htmlSanitizer,
        LiveStreamText,
        react: reactRuntime,
        useToast,
        Icon,
        useSpeech,
        ArenaResponsePanel,
        jsxRuntime,
      } = resolveDependencies(getDependencies);

      const { activePersona } = personaStore();
      const { showToast } = useToast();
      const isUserMessage = message.role === 'user';
      const isSystemMessage = message.role === 'system';
      const editTextareaRef = reactRuntime.useRef(null);

      const {
        playImmediately,
        currentPlayingId,
        settings: speechSettings,
      } = useSpeech();
      const isPlayingThisMessage = currentPlayingId === message.id;
      const isTtsEnabled = speechSettings.tts_enabled;
      const ttsVoice = speechSettings.tts_voice || 'Kore';
      const ttsProvider = speechSettings.tts_provider || 'gemini';
      const ttsNativeVoice = speechSettings.tts_native_voice || '';
      const ttsRate = speechSettings.tts_rate ?? 1;
      const ttsPitch = speechSettings.tts_pitch ?? 1;
      const isPendingArena = message.arena && message.arena.enabled && message.arena.selected === null;

      const { mainHtml, thinkingBlocks } = reactRuntime.useMemo(() => {
        if (isUserMessage || !message.content || isStreaming || isPendingArena) {
          return { mainHtml: '', thinkingBlocks: [] };
        }
        let preparedText = message.content;
        if (activePersona) {
          preparedText = preparedText.replace(/{{user}}/gi, activePersona.name);
        }

        const blocks = [];
        if (message.reasoning_content) {
          blocks.push({
            label: 'Suy nghĩ',
            content: message.reasoning_content,
          });
        }

        const {
          thinkingBlocks: inlineBlocks,
          remainingText,
        } = extractThinkingBlocksAndCleanText(preparedText, showPipeline);
        blocks.push(...inlineBlocks);

        const parsedHtml = markdownParser.parse(remainingText.trim());
        return {
          mainHtml: htmlSanitizer.sanitize(parsedHtml, MARKDOWN_SANITIZE_OPTIONS),
          thinkingBlocks: blocks,
        };
      }, [isUserMessage, message.content, activePersona, isStreaming, isPendingArena, showPipeline]);

      reactRuntime.useEffect(() => {
        if (isEditing && editTextareaRef.current) {
          const textarea = editTextareaRef.current;
          textarea.style.height = 'auto';
          textarea.style.height = `${textarea.scrollHeight}px`;
          textarea.focus();
        }
      }, [isEditing, editingContent]);

      if (isEditing) {
        return jsxRuntime.jsxs('div', {
          className: `flex items-start gap-3 my-4 ${isUserMessage ? 'flex-row-reverse' : 'flex-row'}`,
          children: [
            !isUserMessage && !isSystemMessage && jsxRuntime.jsx('div', {
              className: 'w-10 h-10 rounded-full bg-slate-700 flex-shrink-0',
            }),
            jsxRuntime.jsxs('div', {
              className: `rounded-lg px-4 py-3 max-w-lg w-full ${isUserMessage ? 'bg-sky-600' : 'bg-slate-700'}`,
              children: [
                jsxRuntime.jsx('textarea', {
                  ref: editTextareaRef,
                  value: editingContent,
                  'aria-label': 'Nội dung tin nhắn',
                  onChange: event => onContentChange(event.target.value),
                  className: 'w-full bg-transparent text-white focus:outline-none resize-none overflow-hidden',
                  rows: 1,
                }),
                jsxRuntime.jsxs('div', {
                  className: 'mt-2 flex justify-end gap-2',
                  children: [
                    jsxRuntime.jsx('button', {
                      onClick: onCancel,
                      className: 'px-3 py-1 text-xs font-semibold rounded-md bg-slate-600 hover:bg-slate-500 text-white ',
                      children: 'Hủy',
                    }),
                    jsxRuntime.jsx('button', {
                      onClick: onSave,
                      className: 'px-3 py-1 text-xs font-semibold rounded-md bg-sky-500 hover:bg-sky-400 text-white ',
                      children: 'Lưu',
                    }),
                  ],
                }),
              ],
            }),
          ],
        });
      }

      if (isSystemMessage) {
        return jsxRuntime.jsx('div', {
          className: 'flex justify-center my-4 group',
          children: jsxRuntime.jsxs('div', {
            className: 'bg-slate-800/70 border border-slate-600/50 text-slate-400 text-sm px-4 py-2 rounded-full flex items-center gap-2 ',
            children: [
              jsxRuntime.jsx('span', {
                className: 'italic',
                children: message.content,
              }),
              jsxRuntime.jsx('div', {
                className: 'opacity-0 group-hover:opacity-100 ',
                children: jsxRuntime.jsx(MessageActionMenu, {
                  actions: menuActions,
                  isUser: false,
                }),
              }),
            ],
          }),
        });
      }

      if (isPendingArena) {
        return jsxRuntime.jsx(ArenaResponsePanel, {
          message,
          onSelect: selectedSide => onArenaSelect && onArenaSelect(message.id, selectedSide),
          onRetry: retrySide => onArenaRetry && onArenaRetry(message.id, retrySide),
        });
      }

      const handlePlayTts = async () => {
        if (!message.content) {
          return;
        }
        try {
          const selectedVoice = ttsProvider === 'native' ? ttsNativeVoice : ttsVoice;
          playImmediately(message.content, selectedVoice, message.id, {
            provider: ttsProvider,
            rate: ttsRate,
            pitch: ttsPitch,
          });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          showToast(`TTS Error: ${errorMessage}`, 'error');
        }
      };

      return jsxRuntime.jsxs('div', {
        className: `flex items-end gap-2 my-4 group ${isUserMessage ? 'flex-row-reverse' : 'flex-row'}`,
        children: [
          jsxRuntime.jsx('div', {
            className: 'flex-shrink-0 self-center opacity-0 group-hover:opacity-100  ',
            children: jsxRuntime.jsx(MessageActionMenu, {
              actions: menuActions,
              isUser: isUserMessage,
            }),
          }),
          !isUserMessage && jsxRuntime.jsx('div', {
            className: 'w-10 h-10 rounded-full bg-slate-700 flex-shrink-0 overflow-hidden self-start shadow-md border border-slate-600/30',
            children: avatarUrl
              ? jsxRuntime.jsx('img', {
                  src: avatarUrl,
                  alt: '',
                  className: 'w-full h-full object-cover',
                })
              : jsxRuntime.jsx('div', {
                  className: 'w-full h-full flex items-center justify-center text-slate-400',
                  'aria-hidden': 'true',
                  children: jsxRuntime.jsx(Icon, {
                    name: 'character',
                    className: 'h-5 w-5',
                  }),
                }),
          }),
          jsxRuntime.jsxs('div', {
            className: `rounded-lg px-4 py-2 max-w-lg shadow-sm relative ${
              isUserMessage
                ? 'bg-sky-600 text-white rounded-br-none'
                : 'bg-slate-700/90  text-slate-200 rounded-bl-none'
            }`,
            children: [
              !isUserMessage && isTtsEnabled && !isStreaming && jsxRuntime.jsx('div', {
                className: 'absolute -top-3 -right-2 flex items-center gap-1',
                children: jsxRuntime.jsx('button', {
                  onClick: handlePlayTts,
                  disabled: isPlayingThisMessage,
                  className: `p-1.5 rounded-full shadow-sm border  ${
                    isPlayingThisMessage
                      ? 'bg-sky-500 text-white border-sky-400 '
                      : 'bg-slate-800 text-slate-400 border-slate-600 hover:text-sky-400 hover:border-sky-500'
                  }`,
                  title: isPlayingThisMessage ? 'Đang đọc...' : 'Đọc tin nhắn (TTS)',
                  'aria-label': isPlayingThisMessage ? 'Đang đọc tin nhắn' : 'Đọc tin nhắn này',
                  children: isPlayingThisMessage
                    ? jsxRuntime.jsx('span', {
                        className: 'text-sm font-bold',
                        'aria-hidden': 'true',
                        children: '…',
                      })
                    : jsxRuntime.jsx(Icon, {
                        name: 'volume',
                        className: 'h-4 w-4',
                      }),
                }),
              }),
              isUserMessage
                ? jsxRuntime.jsx('p', {
                    className: 'mes_text whitespace-pre-wrap',
                    children: message.content,
                  })
                : jsxRuntime.jsx(jsxRuntime.Fragment, {
                    children: isStreaming
                      ? jsxRuntime.jsx(LiveStreamText, {
                          messageId: message.id,
                          slot: 'main',
                          fallback: message.content,
                        })
                      : jsxRuntime.jsxs(jsxRuntime.Fragment, {
                          children: [
                            thinkingBlocks.map((block, index) => jsxRuntime.jsx(ThinkingBlock, {
                              content: block.content,
                              label: block.label,
                            }, index)),
                            jsxRuntime.jsx('div', {
                              className: 'mes_text markdown-content',
                              dangerouslySetInnerHTML: { __html: mainHtml },
                            }),
                          ],
                        }),
                  }),
            ],
          }),
        ],
      });
    },
    (prevProps, nextProps) => (
      prevProps.message.content === nextProps.message.content
      && prevProps.message.role === nextProps.message.role
      && prevProps.message.id === nextProps.message.id
      && prevProps.isEditing === nextProps.isEditing
      && prevProps.editingContent === nextProps.editingContent
      && prevProps.avatarUrl === nextProps.avatarUrl
      && prevProps.isImmersive === nextProps.isImmersive
      && prevProps.isStreaming === nextProps.isStreaming
      && prevProps.message.arena?.enabled === nextProps.message.arena?.enabled
      && prevProps.message.arena?.modelA.content === nextProps.message.arena?.modelA.content
      && prevProps.message.arena?.modelB.content === nextProps.message.arena?.modelB.content
      && prevProps.message.arena?.modelA.completed === nextProps.message.arena?.modelA.completed
      && prevProps.message.arena?.modelA.status === nextProps.message.arena?.modelA.status
      && prevProps.message.arena?.modelB.completed === nextProps.message.arena?.modelB.completed
      && prevProps.message.arena?.modelB.status === nextProps.message.arena?.modelB.status
      && prevProps.message.arena?.selected === nextProps.message.arena?.selected
      && areMenuActionsEqual(prevProps.menuActions, nextProps.menuActions)
      && prevProps.onArenaRetry === nextProps.onArenaRetry
    ),
  );
}

export function createMessageList(react, getDependencies) {
  return react.memo(function MessageList({
    messages,
    isLoading,
    isSummarizing = false,
    isImmersive,
    characterName,
    characterAvatarUrl,
    userAvatarUrl,
    embeddedAssets = {},
    userPersonaName,
    characterId,
    sessionId,
    editingMessageId,
    editingContent,
    setEditingContent,
    onStartEdit,
    onCancelEdit,
    onSaveEdit,
    regenerateLastResponse,
    onDeleteMessage,
    onDeleteSingleMessage,
    onOpenAuthorNote,
    onOpenWorldInfo,
    onArenaSelect,
    onArenaRetry,
    disableInteractiveMode = false,
    scripts,
    variables,
    extensionSettings,
    characterCard,
    preset,
    persona,
    iframeRefs,
    onIframeLoad,
  }) {
    const {
      getRuntimeEngineMode,
      StreamingHtmlPreview,
      ThinkingBlock,
      getCompatibilityMode,
      MessageActionMenu,
      compatibilityModeEvent,
      react: reactRuntime,
      CardFrame,
      runtimeEngineModeEvent,
      LoadingIndicator,
      ChatMessage,
      useSpeech,
      ReadAloudButton,
      jsxRuntime,
    } = resolveDependencies(getDependencies);

    const scrollAnchorRef = reactRuntime.useRef(null);
    const containerRef = reactRuntime.useRef(null);
    const previousMessageCountRef = reactRuntime.useRef(messages.length);
    const previousLastMessageIdRef = reactRuntime.useRef(
      messages.length > 0 ? messages[messages.length - 1].id : null,
    );
    const autoScrollTimerRef = reactRuntime.useRef(null);

    const { settings: speechSettings } = useSpeech();
    const isTtsEnabled = speechSettings.tts_enabled;
    const ttsVoice = speechSettings.tts_voice || 'Kore';
    const ttsProvider = speechSettings.tts_provider || 'gemini';
    const ttsNativeVoice = speechSettings.tts_native_voice || '';
    const ttsRate = speechSettings.tts_rate ?? 1;
    const ttsPitch = speechSettings.tts_pitch ?? 1;

    const [visibleCount, setVisibleCount] = reactRuntime.useState(10);
    const [manuallyActivatedMessageId, setManuallyActivatedMessageId] = reactRuntime.useState(null);
    const [compatibilityMode, setCompatibilityMode] = reactRuntime.useState(getCompatibilityMode);
    const [engineMode, setEngineMode] = reactRuntime.useState(getRuntimeEngineMode);
    const previousScrollHeightRef = reactRuntime.useRef(0);

    reactRuntime.useEffect(() => {
      setVisibleCount(10);
      setManuallyActivatedMessageId(null);
    }, [sessionId]);

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

    reactRuntime.useLayoutEffect(() => {
      if (containerRef.current && previousScrollHeightRef.current > 0) {
        const scrollDelta = containerRef.current.scrollHeight - previousScrollHeightRef.current;
        containerRef.current.scrollTop += scrollDelta;
        previousScrollHeightRef.current = 0;
      }
    }, [visibleCount]);

    const visibleMessages = messages.slice(-visibleCount);
    const hasOlderMessages = messages.length > visibleCount;
    const interactiveMessageIds = visibleMessages
      .filter(msg => Boolean(msg.interactiveHtml) || Boolean(msg.interactiveHtmlBlocks?.length))
      .map(msg => msg.id);
    const recentInteractiveIds = interactiveMessageIds.slice(-4);
    const activeInteractiveIdSet = new Set(
      compatibilityMode === 'full'
        ? interactiveMessageIds
        : (manuallyActivatedMessageId && !recentInteractiveIds.includes(manuallyActivatedMessageId)
            ? [...recentInteractiveIds.slice(-3), manuallyActivatedMessageId]
            : recentInteractiveIds),
    );

    reactRuntime.useEffect(() => {
      const appendedMessages = messages.length > previousMessageCountRef.current;
      const latestMessageId = messages.length > 0 ? messages[messages.length - 1].id : null;
      const latestMessageChanged = latestMessageId !== previousLastMessageIdRef.current;

      if ((appendedMessages || latestMessageChanged) && !editingMessageId) {
        if (autoScrollTimerRef.current) {
          clearTimeout(autoScrollTimerRef.current);
        }
        autoScrollTimerRef.current = setTimeout(() => {
          const container = containerRef.current;
          if (container && container.scrollHeight - container.scrollTop - container.clientHeight <= 320) {
            container.scrollTo({
              top: container.scrollHeight,
              behavior: 'auto',
            });
          }
          autoScrollTimerRef.current = null;
        }, 100);
      }

      previousMessageCountRef.current = messages.length;
      previousLastMessageIdRef.current = latestMessageId;

      return () => {
        if (autoScrollTimerRef.current) {
          clearTimeout(autoScrollTimerRef.current);
          autoScrollTimerRef.current = null;
        }
      };
    }, [messages, editingMessageId]);

    let latestModelMessageIndex = -1;
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      if (messages[index].role === 'model') {
        latestModelMessageIndex = index;
        break;
      }
    }
    const lastMessageIndex = messages.length - 1;

    const handleLoadMoreMessages = () => {
      if (containerRef.current) {
        previousScrollHeightRef.current = containerRef.current.scrollHeight;
      }
      setVisibleCount(count => count + 10);
    };

    const showLoadingPlaceholder = isLoading
      && (messages.length === 0
        || messages[messages.length - 1].role !== 'model'
        || (!messages[messages.length - 1].content && !messages[messages.length - 1].arena));

    return jsxRuntime.jsxs('div', {
      id: 'chat',
      ref: containerRef,
      role: 'region',
      'aria-label': 'Lịch sử trò chuyện',
      'aria-busy': isLoading ? 'true' : 'false',
      className: `flex-grow min-h-0 p-4 md:p-6 overflow-y-auto custom-scrollbar relative z-10 w-full ${
        isImmersive ? 'max-w-5xl mx-auto ' : ''
      }`,
      children: [
        hasOlderMessages && jsxRuntime.jsx('div', {
          className: 'flex justify-center mb-4',
          children: jsxRuntime.jsxs('button', {
            onClick: handleLoadMoreMessages,
            className: 'text-xs text-slate-500 hover:text-sky-400 bg-slate-800/50 hover:bg-slate-800 px-3 py-1.5 rounded-full  border border-slate-700/50',
            children: [
              'Tải thêm tin nhắn cũ (',
              Math.min(10, messages.length - visibleCount),
              '/',
              messages.length - visibleCount,
              ')',
            ],
          }),
        }),
        visibleMessages.map((message, visibleIndex) => {
          const absoluteIndex = messages.length - visibleMessages.length + visibleIndex;
          const isLastMessage = absoluteIndex === lastMessageIndex;
          const isLatestModelMessage = absoluteIndex === latestModelMessageIndex;
          const canRegenerate = !isLoading
            && !isSummarizing
            && message.role !== 'system'
            && (isLatestModelMessage || isLastMessage);
          const canDelete = !isLoading && !isSummarizing;
          const isMessageStreaming = isLoading && isLastMessage && message.role === 'model';

          const streamingPreviewHtml = null;
          const interactiveHtml = message.interactiveHtml || streamingPreviewHtml;
          const htmlBlocks = engineMode === 'official-local'
            ? (message.interactiveHtmlBlocks?.length
                ? message.interactiveHtmlBlocks
                : (interactiveHtml ? [interactiveHtml] : []))
            : (interactiveHtml ? [interactiveHtml] : []);

          const menuActions = [
            { label: 'Chỉnh sửa', onClick: () => onStartEdit(message) },
            { label: 'Ghi chú của Tác giả', onClick: onOpenAuthorNote },
            { label: 'Quản lý World Info', onClick: onOpenWorldInfo },
            {
              label: message.role === 'user' ? 'Gửi lại (Tạo lại)' : 'Tạo lại phản hồi',
              onClick: regenerateLastResponse,
              disabled: !canRegenerate,
            },
            {
              label: 'Xóa từ đây (Tua lại)',
              onClick: () => onDeleteMessage(message.id),
              disabled: !canDelete,
              className: 'text-red-400 hover:bg-red-800/50',
            },
          ];

          if (disableInteractiveMode) {
            menuActions.push({
              label: 'Xóa tin nhắn này',
              onClick: () => onDeleteSingleMessage(message.id),
              disabled: !canDelete,
              className: 'text-orange-400 hover:bg-orange-800/50',
            });
          }

          const hasRenderableContent = Boolean(
            message.content.trim()
            || htmlBlocks.length > 0
            || message.arena
            || editingMessageId === message.id,
          );
          if (!hasRenderableContent) {
            return null;
          }

          const renderActiveFrames = () => {
            const cleanedBlocks = [...htmlBlocks];
            let extractedThinking = null;
            const thinkingMatch = cleanedBlocks[0]?.match(/<(thinking|inner_monologue)>([\s\S]*?)<\/\1>/i);
            if (thinkingMatch) {
              extractedThinking = thinkingMatch[2].trim();
              cleanedBlocks[0] = cleanedBlocks[0].replace(thinkingMatch[0], '');
            }

            return jsxRuntime.jsxs(jsxRuntime.Fragment, {
              children: [
                extractedThinking && jsxRuntime.jsx('div', {
                  className: 'mb-2',
                  children: jsxRuntime.jsx(ThinkingBlock, { content: extractedThinking }),
                }),
                cleanedBlocks.map((blockHtml, blockIndex) => jsxRuntime.jsx(CardFrame, {
                  ref: iframeElement => {
                    iframeRefs.current[`${message.id}:${blockIndex}`] = iframeElement;
                    if (blockIndex === 0) {
                      iframeRefs.current[message.id] = iframeElement;
                    }
                  },
                  htmlContent: blockHtml,
                  scripts,
                  originalContent: message.originalRawContent || '',
                  initialData: variables,
                  extensionSettings,
                  onLoad: () => onIframeLoad(message.id),
                  characterName,
                  userPersonaName,
                  characterId,
                  chatId: sessionId,
                  messageId: absoluteIndex,
                  iframeIndex: blockIndex,
                  presetName: preset?.name,
                  personaId: persona?.id,
                  characterCard,
                  worldInfo: characterCard?.char_book?.entries,
                  chatHistory: messages,
                  characterAvatarUrl: characterAvatarUrl || undefined,
                  userAvatarUrl,
                  embeddedAssets,
                  runtimeMode: 'active',
                }, `${message.id}-html-${blockIndex}`)),
              ],
            });
          };

          return jsxRuntime.jsxs('div', {
            id: `message-${absoluteIndex}`,
            className: 'mes chat_msg group relative flex flex-col gap-2 my-4',
            'data-message-id': absoluteIndex,
            mesid: absoluteIndex,
            ch_name: message.role === 'user' ? userPersonaName : characterName,
            is_user: message.role === 'user' ? 'true' : 'false',
            children: [
              (message.content.trim() || message.arena || editingMessageId === message.id)
                && jsxRuntime.jsx(ChatMessage, {
                  message,
                  avatarUrl: characterAvatarUrl,
                  isEditing: editingMessageId === message.id,
                  editingContent,
                  onContentChange: setEditingContent,
                  onSave: onSaveEdit,
                  onCancel: onCancelEdit,
                  menuActions,
                  isImmersive,
                  isStreaming: isMessageStreaming,
                  onArenaSelect,
                  onArenaRetry,
                  showPipeline: isLatestModelMessage,
                }),
              htmlBlocks.length > 0 && jsxRuntime.jsxs('div', {
                className: 'relative w-full',
                children: [
                  !message.content.trim() && editingMessageId !== message.id && jsxRuntime.jsxs('div', {
                    className: 'absolute top-0 right-0 z-20 flex items-center gap-2 p-2 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto',
                    children: [
                      isTtsEnabled && jsxRuntime.jsx(ReadAloudButton, {
                        rawContent: message.originalRawContent || htmlBlocks.join('\n'),
                        voice: ttsVoice,
                        provider: ttsProvider,
                        nativeVoice: ttsNativeVoice,
                        rate: ttsRate,
                        pitch: ttsPitch,
                      }),
                      jsxRuntime.jsx('div', {
                        className: 'bg-slate-800/90 rounded-full shadow-md border border-slate-600/50',
                        children: jsxRuntime.jsx(MessageActionMenu, {
                          actions: menuActions,
                          isUser: false,
                        }),
                      }),
                    ],
                  }),
                  compatibilityMode === 'safe' && streamingPreviewHtml && !message.interactiveHtml
                    ? jsxRuntime.jsx(StreamingHtmlPreview, {
                        htmlContent: streamingPreviewHtml,
                        characterName,
                      })
                    : activeInteractiveIdSet.has(message.id)
                      ? renderActiveFrames()
                      : jsxRuntime.jsxs('div', {
                          className: 'rounded-lg border border-slate-700/60 bg-slate-900/40 p-3 text-sm text-slate-300',
                          children: [
                            jsxRuntime.jsx('p', {
                              className: 'mb-2',
                              children: 'Giao diện HTML cũ đang tạm ngủ để giảm RAM và tránh nhiều script chạy đồng thời.',
                            }),
                            jsxRuntime.jsx('button', {
                              onClick: () => setManuallyActivatedMessageId(message.id),
                              className: 'px-3 py-1.5 rounded bg-sky-700 hover:bg-sky-600 text-white font-medium',
                              'aria-label': 'Kích hoạt giao diện HTML này',
                              children: 'Kích hoạt giao diện HTML',
                            }),
                          ],
                        }),
                ],
              }),
            ],
          }, message.id);
        }),
        showLoadingPlaceholder && jsxRuntime.jsxs('div', {
          className: 'flex items-start gap-3 my-4 flex-row',
          children: [
            jsxRuntime.jsx('div', {
              className: 'w-10 h-10 rounded-full bg-slate-700 flex-shrink-0 overflow-hidden',
              children: characterAvatarUrl && jsxRuntime.jsx('img', {
                src: characterAvatarUrl,
                alt: 'Avatar',
                className: 'w-full h-full object-cover',
              }),
            }),
            jsxRuntime.jsx('div', {
              className: 'rounded-lg px-4 py-2 max-w-lg bg-slate-700/90 text-slate-200 rounded-bl-none ',
              children: jsxRuntime.jsx(LoadingIndicator, {
                message: 'Đang phân tích bối cảnh & tạo câu trả lời...',
              }),
            }),
          ],
        }),
        jsxRuntime.jsx('div', { ref: scrollAnchorRef }),
      ],
    });
  });
}

export function createCardPreviewDialog(react, getDependencies) {
  return react.forwardRef(function CardPreviewDialog({
    isOpen,
    onClose,
    htmlContent,
    characterName,
    messageId,
  }, forwardedRef) {
    const {
      react: reactRuntime,
      Icon,
      jsxRuntime,
    } = resolveDependencies(getDependencies);

    const [isMinimized, setIsMinimized] = reactRuntime.useState(false);
    const [mirroredHtml, setMirroredHtml] = reactRuntime.useState('');
    const [syncStatus, setSyncStatus] = reactRuntime.useState('connecting');

    const fallbackSafeHtml = reactRuntime.useMemo(() => {
      try {
        const parsedDoc = new DOMParser().parseFromString(
          htmlContent || '<div>Không có nội dung HUD.</div>',
          'text/html',
        );
        parsedDoc.querySelectorAll('script').forEach(node => node.remove());
        parsedDoc.querySelectorAll('[autofocus]').forEach(node => node.removeAttribute('autofocus'));
        return `<!doctype html>${parsedDoc.documentElement.outerHTML}`;
      } catch {
        return '<!doctype html><html><head><meta charset="utf-8"></head><body>Không thể tạo bản xem HUD an toàn.</body></html>';
      }
    }, [htmlContent]);

    reactRuntime.useEffect(() => {
      if (!isOpen) {
        return;
      }

      let sourceIframe = null;
      let pollTimerId = 0;
      let cancelled = false;

      const handleMirrorSnapshot = event => {
        if (
          !sourceIframe?.contentWindow
          || event.source !== sourceIframe.contentWindow
          || !isFrameMessageOrigin(sourceIframe, event.origin, window.location.origin)
          || event.data?.type !== 'CARD_RUNTIME_MIRROR_SNAPSHOT'
        ) {
          return;
        }
        const payload = event.data.payload;
        if (messageId !== undefined && Number(payload?.messageId) !== Number(messageId)) {
          return;
        }
        const snapshotHtml = String(payload?.html || '');
        if (snapshotHtml) {
          setMirroredHtml(snapshotHtml);
          setSyncStatus('live');
        }
      };

      const subscribeToActiveFrame = () => {
        if (cancelled) {
          return;
        }
        const selector = messageId === undefined
          ? 'iframe[data-card-studio-iframe="true"][data-card-runtime-active="true"]'
          : `iframe[data-card-studio-iframe="true"][data-card-runtime-active="true"][data-card-message-id="${messageId}"]`;
        const candidateIframe = Array.from(document.querySelectorAll(selector)).at(-1) || null;
        if (candidateIframe?.contentWindow) {
          if (sourceIframe && sourceIframe !== candidateIframe) {
            postFrameMessage(sourceIframe, { type: 'CARD_RUNTIME_MIRROR_UNSUBSCRIBE' });
          }
          sourceIframe = candidateIframe;
          postFrameMessage(candidateIframe, { type: 'CARD_RUNTIME_MIRROR_SUBSCRIBE' });
          return;
        }
        setMirroredHtml(fallbackSafeHtml);
        setSyncStatus('fallback');
      };

      window.addEventListener('message', handleMirrorSnapshot);
      subscribeToActiveFrame();
      pollTimerId = window.setInterval(subscribeToActiveFrame, 1200);

      return () => {
        cancelled = true;
        window.removeEventListener('message', handleMirrorSnapshot);
        window.clearInterval(pollTimerId);
        postFrameMessage(sourceIframe, { type: 'CARD_RUNTIME_MIRROR_UNSUBSCRIBE' });
      };
    }, [isOpen, messageId, fallbackSafeHtml]);

    if (!isOpen) {
      return null;
    }

    if (!htmlContent) {
      return jsxRuntime.jsxs('div', {
        className: 'fixed top-20 right-4 w-80 bg-slate-800/90 border border-red-500/50 rounded-xl p-4 shadow-2xl z-40 text-red-300 text-sm',
        children: [
          jsxRuntime.jsxs('div', {
            className: 'flex justify-between items-center mb-2',
            children: [
              jsxRuntime.jsx('span', { className: 'font-bold', children: 'Lỗi HUD' }),
              jsxRuntime.jsx('button', {
                onClick: onClose,
                'aria-label': 'Đóng thông báo lỗi',
                children: jsxRuntime.jsx(Icon, { name: 'close', className: 'h-4 w-4' }),
              }),
            ],
          }),
          jsxRuntime.jsx('p', {
            children: 'Không tìm thấy nội dung giao diện thẻ HTML trong lịch sử trò chuyện.',
          }),
        ],
      });
    }

    const statusLabel = syncStatus === 'live'
      ? 'Đồng bộ trực tiếp, không chạy lại script'
      : (syncStatus === 'fallback' ? 'Bản xem an toàn' : 'Đang kết nối giao diện gốc');

    return jsxRuntime.jsxs('div', {
      className: `fixed right-4 z-40 ease-in-out flex flex-col shadow-2xl bg-slate-900/80 border border-slate-600/50 rounded-xl overflow-hidden ${
        isMinimized ? 'w-48 h-10 bottom-24' : 'w-[450px] max-w-[90vw] h-[80vh] top-20'
      }`,
      role: 'dialog',
      'aria-label': `HUD trạng thái của ${characterName}`,
      children: [
        jsxRuntime.jsxs('div', {
          className: 'flex items-center justify-between px-3 py-2 bg-slate-800/80 border-b border-slate-700 shrink-0',
          children: [
            jsxRuntime.jsxs('div', {
              className: 'min-w-0',
              children: [
                jsxRuntime.jsxs('span', {
                  className: 'font-bold text-slate-200 text-sm truncate block',
                  children: [characterName, ' - Trạng thái'],
                }),
                !isMinimized && jsxRuntime.jsx('span', {
                  className: 'text-[10px] text-slate-400',
                  children: statusLabel,
                }),
              ],
            }),
            jsxRuntime.jsxs('div', {
              className: 'flex items-center gap-1 shrink-0',
              children: [
                jsxRuntime.jsx('button', {
                  onClick: () => setIsMinimized(!isMinimized),
                  className: 'p-1 text-slate-300 hover:text-white hover:bg-slate-700 rounded',
                  'aria-label': isMinimized ? 'Mở rộng HUD' : 'Thu nhỏ HUD',
                  children: jsxRuntime.jsx(Icon, {
                    name: isMinimized ? 'expand' : 'collapse',
                    className: 'h-4 w-4',
                  }),
                }),
                jsxRuntime.jsx('button', {
                  onClick: onClose,
                  className: 'p-1 text-slate-300 hover:text-red-400 hover:bg-slate-700 rounded',
                  'aria-label': 'Đóng HUD',
                  children: jsxRuntime.jsx(Icon, { name: 'close', className: 'h-4 w-4' }),
                }),
              ],
            }),
          ],
        }),
        !isMinimized && jsxRuntime.jsx('div', {
          className: 'flex-1 min-h-0 overflow-auto relative bg-slate-900/50',
          children: jsxRuntime.jsx('iframe', {
            ref: forwardedRef,
            srcDoc: mirroredHtml || fallbackSafeHtml,
            title: `Bản sao HUD của ${characterName}`,
            sandbox: 'allow-forms allow-pointer-lock',
            className: 'block w-full h-full min-h-full border-0 bg-transparent',
            style: { minHeight: '100%' },
          }),
        }),
      ],
    });
  });
}

export function createChatHud(react, getDependencies) {
  return react.forwardRef(function ChatHud({ uiState, data, actions }, forwardedRef) {
    const {
      VariableHud,
      RpgHud,
      ActionSuggestionDialog,
      ChatDialogs,
      InteractiveErrorDialog,
      jsxRuntime,
      CardPreviewDialog,
    } = resolveDependencies(getDependencies);

    const combinedWorldInfoEntries = [
      ...(data.card.char_book?.entries || []),
      ...(data.generatedLorebookEntries || []),
    ];

    return jsxRuntime.jsxs(jsxRuntime.Fragment, {
      children: [
        jsxRuntime.jsx(ChatDialogs, {
          isAuthorNoteOpen: uiState.isAuthorNoteOpen,
          setIsAuthorNoteOpen: uiState.setIsAuthorNoteOpen,
          authorNote: data.authorNote,
          updateAuthorNote: actions.updateAuthorNote,
          isWorldInfoOpen: uiState.isWorldInfoOpen,
          setIsWorldInfoOpen: uiState.setIsWorldInfoOpen,
          worldInfoEntries: combinedWorldInfoEntries,
          worldInfoState: data.worldInfoState,
          worldInfoPinned: data.worldInfoPinned,
          worldInfoPlacement: data.worldInfoPlacement,
          updateWorldInfoState: actions.updateWorldInfoState,
          updateWorldInfoPinned: actions.updateWorldInfoPinned,
          updateWorldInfoPlacement: actions.updateWorldInfoPlacement,
          isLorebookCreatorOpen: uiState.isLorebookCreatorOpen,
          setIsLorebookCreatorOpen: uiState.setIsLorebookCreatorOpen,
          lorebookKeyword: uiState.lorebookKeyword,
          setLorebookKeyword: uiState.setLorebookKeyword,
          messages: data.messages,
          longTermSummaries: data.longTermSummaries,
          lorebooks: data.lorebooks,
          characterId: data.card.fileName || data.card.name,
        }),
        jsxRuntime.jsx(ActionSuggestionDialog, {
          isOpen: uiState.isAssistantOpen,
          onClose: () => uiState.setIsAssistantOpen(false),
          gameHistory: data.messages,
          card: data.card,
          variables: data.variables,
          logs: data.logs,
          onUpdateVariable: actions.handleUpdateVariable,
          onRewriteMessage: actions.handleRewriteLastTurn,
        }),
        jsxRuntime.jsx(VariableHud, {
          variables: data.variables,
          isOpen: uiState.isHUDOpen,
          onClose: () => uiState.setIsHUDOpen(false),
        }),
        jsxRuntime.jsx(RpgHud, {
          data: data.card.rpg_data,
          isOpen: uiState.isRpgDashboardOpen,
          onClose: () => uiState.setIsRpgDashboardOpen(false),
        }),
        jsxRuntime.jsx(CardPreviewDialog, {
          ref: forwardedRef,
          isOpen: uiState.isStatusHUDOpen,
          onClose: () => uiState.setIsStatusHUDOpen(false),
          htmlContent: data.lastInteractiveMsg?.interactiveHtml || '',
          scripts: data.card.extensions?.TavernHelper_scripts || [],
          originalRawContent: data.lastInteractiveMsg?.originalRawContent || '',
          variables: data.variables,
          extensionSettings: data.extensionSettings,
          characterName: data.card.name,
          userPersonaName: data.userPersonaName,
          characterId: data.card.fileName || data.card.name,
          sessionId: data.sessionId,
          characterAvatarUrl: data.characterAvatarUrl,
          userAvatarUrl: data.userPersonaAvatarUrl,
          embeddedAssets: data.card.__embedded_assets || {},
          characterCard: data.card,
          chatHistory: data.messages,
          messageId: data.lastInteractiveMsg
            ? data.messages.indexOf(data.lastInteractiveMsg)
            : Math.max(0, data.messages.length - 1),
        }),
        jsxRuntime.jsx(InteractiveErrorDialog, {
          errorState: data.interactiveError,
          onRetry: () => actions.handleUserDecision('retry'),
          onIgnore: () => actions.handleUserDecision('ignore'),
        }),
      ],
    });
  });
}