import { summaryChunkSize } from '../history-policy.js';
import { resolveCatalogTarget, refreshDialogProxyCatalog } from '../../../../m4/providers/common/model-catalog.js';

// Recovered application UI. The existing React instance and feature dependencies are injected.
// Semantic dependency contract: callers inject named dependencies directly.

function resolveSessionDependencies(getDependencies) {
  const deps = getDependencies();
  return {
    react: deps.react,
    jsxRuntime: deps.jsxRuntime,
    useToast: deps.useToast,
    sessionStore: deps.sessionStore,
    characterStore: deps.characterStore,
    presetStore: deps.presetStore,
    personaStore: deps.personaStore,
    lorebookStore: deps.lorebookStore,
    Icon: deps.Icon,
    LoadingIndicator: deps.LoadingIndicator,
    ToggleSwitch: deps.ToggleSwitch,
    useDialogFocus: deps.useDialogFocus,
    useGeminiCatalog: deps.useGeminiCatalog,
    useSpeech: deps.useSpeech,
    ModelTestButton: deps.ModelTestButton,
    buildSavedProbeTarget: deps.buildSavedProbeTarget,
    testModel: deps.testModel,
    connections: deps.connections,
    proxyPersistence: deps.proxyPersistence,
    catalog: deps.catalog,
    saveProfiles: deps.saveProfiles,
    truncateText: deps.truncateText,
    loadSessionById: deps.loadSessionById,
    saveSessionRecord: deps.saveSessionRecord,
    listSavedSessions: deps.listSavedSessions,
    deleteSessionRecord: deps.deleteSessionRecord,
    normalizeCharacterForSave: deps.normalizeCharacterForSave,
    readEpub: deps.readEpub,
    relativeTimeUnits: deps.relativeTimeUnits,
    executeVariableScript: deps.executeVariableScript,
    expandBasicMacros: deps.expandBasicMacros,
    expandRandomMacros: deps.expandRandomMacros,
    extractRegexScripts: deps.extractRegexScripts,
    resolveCharacterName: deps.resolveCharacterName,
    processRegex: deps.processRegex,
    resolveWorldInfo: deps.resolveWorldInfo,
    yamlParser: deps.yamlParser,
    isPlainObject: deps.isPlainObject,
    deepMergeObject: deps.deepMergeObject,
    isRecordObject: deps.isRecordObject,
    diagnosticsState: deps.diagnosticsState,
    mergeInitialVariableSources: deps.mergeInitialVariableSources,
    repositories: deps.repositories,
    sessionPersistence: deps.sessionPersistence,
    FileNameDialog: deps.FileNameDialog,
    StorySetupDialog: deps.StorySetupDialog,
    GreetingDialog: deps.GreetingDialog,
    CharacterLaunchCard: deps.CharacterLaunchCard,
    AdventureImportDropzone: deps.AdventureImportDropzone,
    SessionListItem: deps.SessionListItem,
    defaultProxyModels: deps.defaultProxyModels,
    defaultGeminiModels: deps.defaultGeminiModels,
    fetchOpenRouterModels: deps.fetchOpenRouterModels,
    getOpenRouterApiKey: deps.getOpenRouterApiKey,
    getOpenRouterCachedModels: deps.getOpenRouterCachedModels,
    getProxyProfiles: deps.getProxyProfiles,
    getProxyUrl: deps.getProxyUrl,
    getProxyPassword: deps.getProxyPassword,
    getProxyLegacyMode: deps.getProxyLegacyMode,
    getConnectionSettings: deps.getConnectionSettings,
    saveConnectionSettings: deps.saveConnectionSettings,
    getActiveModelDisplayName: deps.getActiveModelDisplayName,
    ArenaSettingsDialog: deps.ArenaSettingsDialog,
    QuickConnectionDialog: deps.QuickConnectionDialog,
    SpeechControls: deps.SpeechControls,
    QuickConnectionBadge: deps.QuickConnectionBadge,
    ChatSettingsDialog: deps.ChatSettingsDialog,
    slashCommandHints: deps.slashCommandHints,
    isProxyForToolsEnabled: deps.isProxyForToolsEnabled,
    AuthorNoteDialog: deps.AuthorNoteDialog,
    WorldInfoDialog: deps.WorldInfoDialog,
    LorebookGeneratorModal: deps.LorebookGeneratorModal,
    callProxyToolModel: deps.callProxyToolModel,
    aiStudioToolText: deps.aiStudioToolText,
    callGeminiToolModel: deps.callGeminiToolModel,
    defaultGeminiSafetySettings: deps.defaultGeminiSafetySettings,
    parseLooseJson: deps.parseLooseJson,
    mutateVariable: deps.mutateVariable,
    RpgNotificationBanner: deps.RpgNotificationBanner,
    DiagnosticsFooter: deps.DiagnosticsFooter,
    defaultRefinementPrompt: deps.defaultRefinementPrompt,
    syncLorebookEmbeddings: deps.syncLorebookEmbeddings,
    ChatHud: deps.ChatHud,
    WritingRefinementDialog: deps.WritingRefinementDialog,
    defaultActionSuggestionPrompt: deps.defaultActionSuggestionPrompt,
    MessageList: deps.MessageList,
    getSmartScanSettings: deps.getSmartScanSettings,
    extractStoryContent: deps.extractStoryContent,
    ChatVisualBackdrop: deps.ChatVisualBackdrop,
    countConversationTurns: deps.countConversationTurns,
    ChatWorkspaceFrame: deps.ChatWorkspaceFrame,
    useChatSession: deps.useChatSession,
    getLiterarySettings: deps.getLiterarySettings,
    ChatHeader: deps.ChatHeader,
    getSummarySettings: deps.getSummarySettings,
    ChatComposer: deps.ChatComposer,
    getActionSuggestionSettings: deps.getActionSuggestionSettings,
    getGeminiApiKey: deps.getGeminiApiKey,
  };
}

function splitStoryIntoChunks(storyText, targetWordsPerChunk) {
  const sentences = storyText.match(/[^.!?\n]+([.!?\n]+|$)/g) || [storyText];
  const chunks = [];
  let currentChunk = '';
  let currentWordCount = 0;

  for (const sentence of sentences) {
    const sentenceWords = sentence.trim().split(/\s+/).length;
    if (currentWordCount + sentenceWords > targetWordsPerChunk && currentWordCount > 0) {
      chunks.push(currentChunk.trim());
      currentChunk = sentence;
      currentWordCount = sentenceWords;
    } else {
      currentChunk += sentence;
      currentWordCount += sentenceWords;
    }
  }
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  return chunks;
}

function extractCardExtensionVariables(card, isPlainObject, deepMergeObject, yamlParser) {
  const extensions = isPlainObject(card.extensions) ? card.extensions : {};
  const merged = {};

  const mergeSource = source => {
    if (isPlainObject(source)) {
      deepMergeObject(merged, source);
    } else if (typeof source === 'string' && source.trim()) {
      try {
        const parsed = yamlParser.default.parse(source);
        if (isPlainObject(parsed)) {
          deepMergeObject(merged, parsed);
        }
      } catch {}
    }
  };

  mergeSource(extensions.TavernHelper_variables);
  mergeSource(extensions.tavern_helper_variables);

  if (Array.isArray(extensions.tavern_helper)) {
    extensions.tavern_helper.forEach(entry => {
      if (Array.isArray(entry) && /^(variables|variable)$/i.test(String(entry[0] || ''))) {
        mergeSource(entry[1]);
      }
    });
  } else if (isPlainObject(extensions.tavern_helper)) {
    mergeSource(extensions.tavern_helper.variables);
  }

  return merged;
}

function validateAdventureArchive(rawArchive, isRecordObject) {
  if (!isRecordObject(rawArchive) || !isRecordObject(rawArchive.data)) {
    throw new Error('File không hợp lệ: thiếu khối dữ liệu.');
  }
  const payload = rawArchive.data;
  if (!isRecordObject(payload.character) || !isRecordObject(payload.session)) {
    throw new Error('File không hợp lệ: thiếu dữ liệu phiên hoặc nhân vật.');
  }
  if (
    typeof payload.characterFileName !== 'string'
    || !payload.characterFileName.trim()
    || payload.characterFileName.length > 500
  ) {
    throw new Error('File không hợp lệ: tên tệp nhân vật không hợp lệ.');
  }
  if (
    typeof payload.session.sessionId !== 'string'
    || !payload.session.sessionId.trim()
    || payload.session.sessionId.length > 500
  ) {
    throw new Error('File không hợp lệ: mã phiên không hợp lệ.');
  }
  if (!Array.isArray(payload.session.chatHistory) || payload.session.chatHistory.length > 1000000) {
    throw new Error('File không hợp lệ: lịch sử chat không hợp lệ hoặc quá lớn.');
  }
  return rawArchive;
}

function resolveSelectedQuickModel(connectionSettings, proxyProfiles) {
  if (connectionSettings.source === 'aistudio') {
    return connectionSettings.aistudio_model || 'gemini-2.5-flash';
  }
  if (connectionSettings.source === 'gemini') {
    return connectionSettings.gemini_model;
  }
  if (connectionSettings.source === 'proxy') {
    return proxyProfiles.find(profile => profile.id === connectionSettings.proxy_profile_id)?.chatModel
      || connectionSettings.proxy_model;
  }
  return connectionSettings.openrouter_model;
}

export function createGreetingDialog(getDependencies) {
  return function GreetingDialog({ character, onClose, onStart }) {
    const { truncateText, react, jsxRuntime } = resolveSessionDependencies(getDependencies);
    const greetings = react.useMemo(
      () => [character.card.first_mes, ...(character.card.alternate_greetings || [])],
      [character.card],
    );
    const [expandedIndex, setExpandedIndex] = react.useState(null);
    const dialogRef = react.useRef(null);
    const closeButtonRef = react.useRef(null);
    const previousFocusRef = react.useRef(null);

    react.useEffect(() => {
      previousFocusRef.current = document.activeElement;
      setTimeout(() => closeButtonRef.current?.focus(), 100);

      const handleKeyDown = event => {
        if (event.key === 'Escape') {
          onClose();
          return;
        }
        if (event.key === 'Tab' && dialogRef.current) {
          const focusable = dialogRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          );
          if (focusable.length === 0) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (event.shiftKey) {
            if (document.activeElement === first) {
              last.focus();
              event.preventDefault();
            }
          } else if (document.activeElement === last) {
            first.focus();
            event.preventDefault();
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        previousFocusRef.current?.focus();
      };
    }, [onClose]);

    const toggleExpandGreeting = index => {
      setExpandedIndex(previous => (previous === index ? null : index));
    };

    return jsxRuntime.jsx('div', {
      className: 'fixed inset-0 bg-black/60  flex items-center justify-center z-50 p-4',
      onClick: onClose,
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'chat-start-title',
      children: jsxRuntime.jsxs('div', {
        ref: dialogRef,
        className: 'bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col',
        onClick: event => event.stopPropagation(),
        children: [
          jsxRuntime.jsxs('header', {
            className: 'p-4 border-b border-slate-700 flex justify-between items-center flex-shrink-0',
            children: [
              jsxRuntime.jsxs('div', {
                children: [
                  jsxRuntime.jsxs('h2', {
                    id: 'chat-start-title',
                    className: 'text-xl font-bold text-sky-400',
                    children: ['Bắt đầu trò chuyện với ', character.card.name],
                  }),
                  jsxRuntime.jsx('p', {
                    className: 'text-sm text-slate-400',
                    children: 'Chọn một lời chào để bắt đầu cuộc phiêu lưu của bạn.',
                  }),
                ],
              }),
              jsxRuntime.jsx('button', {
                ref: closeButtonRef,
                onClick: onClose,
                className: 'p-1 text-slate-400 hover:text-white',
                'aria-label': 'Đóng',
                children: jsxRuntime.jsx('svg', {
                  xmlns: 'http://www.w3.org/2000/svg',
                  className: 'h-6 w-6',
                  fill: 'none',
                  viewBox: '0 0 24 24',
                  stroke: 'currentColor',
                  'aria-hidden': 'true',
                  children: jsxRuntime.jsx('path', {
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round',
                    strokeWidth: '2',
                    d: 'M6 18L18 6M6 6l12 12',
                  }),
                }),
              }),
            ],
          }),
          jsxRuntime.jsx('div', {
            className: 'p-6 space-y-4 overflow-y-auto custom-scrollbar',
            children: greetings.map((greetingText, index) => {
              const isExpanded = expandedIndex === index;
              const previewText = truncateText(greetingText, 150);
              const isLongGreeting = greetingText.length > 150;
              return jsxRuntime.jsxs('div', {
                className: 'bg-slate-700/50 p-4 rounded-lg',
                children: [
                  jsxRuntime.jsx('h3', {
                    className: 'font-semibold text-slate-300 mb-2',
                    children: index === 0 ? 'Lời chào chính' : `Lời chào thay thế #${index}`,
                  }),
                  jsxRuntime.jsx('p', {
                    className: 'text-slate-400 text-sm whitespace-pre-wrap',
                    children: isExpanded ? greetingText : previewText,
                  }),
                  jsxRuntime.jsxs('div', {
                    className: 'mt-3 flex justify-between items-center',
                    children: [
                      isLongGreeting && jsxRuntime.jsx('button', {
                        onClick: () => toggleExpandGreeting(index),
                        className: 'text-xs text-sky-400 hover:text-sky-300',
                        children: isExpanded ? 'Thu gọn' : 'Xem thêm',
                      }),
                      jsxRuntime.jsx('div', { className: 'flex-grow' }),
                      jsxRuntime.jsx('button', {
                        onClick: () => onStart(greetingText),
                        className: 'px-4 py-2 text-sm font-medium rounded-md   bg-sky-600 text-white hover:bg-sky-700',
                        children: 'Bắt đầu với lời chào này',
                      }),
                    ],
                  }),
                ],
              }, index);
            }),
          }),
        ],
      }),
    });
  };
}

export function createStorySetupDialog(getDependencies) {
  return function StorySetupDialog({ character, preset, onClose, onStart }) {
    const {
      personaStore,
      loadSessionById,
      saveSessionRecord,
      useDialogFocus,
      react,
      LoadingIndicator,
      readEpub,
      jsxRuntime,
    } = resolveSessionDependencies(getDependencies);

    const [targetWordCount, setTargetWordCount] = react.useState(2000);
    const [selectedFile, setSelectedFile] = react.useState(null);
    const [extractedText, setExtractedText] = react.useState('');
    const [isBusy, setIsBusy] = react.useState(false);
    const [previewLines, setPreviewLines] = react.useState([]);
    const [errorMessage, setErrorMessage] = react.useState('');
    const fileInputRef = react.useRef(null);
    const dialogRef = react.useRef(null);
    const cancelButtonRef = react.useRef(null);
    const { activePersonaId } = personaStore();

    const chunkStory = react.useCallback(
      (storyText, wordLimit) => splitStoryIntoChunks(storyText, wordLimit),
      [],
    );

    const updateChunkPreview = (storyText, wordLimit) => {
      if (!storyText) return;
      const totalWords = storyText.trim().split(/\s+/).length;
      const chunks = chunkStory(storyText, wordLimit);
      setPreviewLines([
        `Tổng số từ: ~${totalWords.toLocaleString()}`,
        `Số đoạn ước tính: ${chunks.length}`,
        `Độ dài trung bình: ~${Math.round(totalWords / chunks.length)} từ/đoạn`,
        '--- Xem trước đoạn 1 (Trích đoạn) ---',
        `${chunks[0].substring(0, 150)}...`,
      ]);
    };

    useDialogFocus(true, onClose, dialogRef, cancelButtonRef);

    const handleFileSelected = async event => {
      if (!event.target.files || event.target.files.length === 0) return;
      const file = event.target.files[0];
      setSelectedFile(file);
      setErrorMessage('');
      setIsBusy(true);
      try {
        const text = file.name.toLowerCase().endsWith('.epub')
          ? await readEpub(file)
          : await file.text();
        if (!text.trim()) {
          throw new Error('File trống hoặc không trích xuất được văn bản.');
        }
        setExtractedText(text);
        updateChunkPreview(text, targetWordCount);
      } catch (error) {
        setErrorMessage(`Không thể đọc file: ${error instanceof Error ? error.message : String(error)}`);
        setSelectedFile(null);
        setExtractedText('');
        setPreviewLines([]);
      } finally {
        setIsBusy(false);
      }
    };

    const handleStartStorySession = async () => {
      if (!selectedFile || !extractedText) return;
      setIsBusy(true);
      setErrorMessage('');
      try {
        const storyQueue = chunkStory(extractedText, targetWordCount);
        const sessionId = character.fileName;
        const existingSession = await loadSessionById(sessionId);
        if (
          existingSession
          && !confirm(`Phiên trò chuyện với ${character.card.name} đã tồn tại. Bạn có muốn ghi đè không?`)
        ) {
          setIsBusy(false);
          return;
        }
        await saveSessionRecord({
          sessionId,
          characterFileName: character.fileName,
          presetName: preset.name,
          userPersonaId: activePersonaId,
          chatHistory: [],
          storyQueue,
          longTermSummaries: [],
          variables: {},
          worldInfoRuntime: {},
          lastMessageSnippet: `Chế độ Cốt Truyện: ${selectedFile.name}`,
          lastUpdated: Date.now(),
        });
        onStart(sessionId);
      } catch (error) {
        setErrorMessage(`Lỗi xử lý file: ${error}`);
        setIsBusy(false);
      }
    };

    return jsxRuntime.jsx('div', {
      className: 'fixed inset-0 bg-black/70  flex items-center justify-center z-50 p-4',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'story-import-title',
      children: jsxRuntime.jsxs('div', {
        ref: dialogRef,
        className: 'bg-slate-800 border border-slate-600 rounded-xl shadow-2xl w-full max-w-lg p-6 ',
        children: [
          jsxRuntime.jsxs('h2', {
            id: 'story-import-title',
            className: 'text-xl font-bold text-sky-400 mb-4 flex items-center gap-2',
            children: [
              jsxRuntime.jsx('span', { children: '📖' }),
              ' Nhập Tiền Truyện (Story Mode)',
            ],
          }),
          jsxRuntime.jsxs('div', {
            className: 'space-y-6',
            children: [
              jsxRuntime.jsxs('div', {
                className: `relative border-2 border-dashed border-slate-600 rounded-lg p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-700/50 hover:border-sky-500/50 focus-within:outline-none focus-within:ring-2 focus-within:ring-sky-400 ${
                  selectedFile ? 'border-sky-500 bg-slate-700/30' : ''
                }`,
                children: [
                  jsxRuntime.jsx('input', {
                    ref: fileInputRef,
                    type: 'file',
                    'aria-label': selectedFile
                      ? `Đổi file tiền truyện, hiện tại ${selectedFile.name}`
                      : 'Chọn file tiền truyện',
                    accept: '.txt,.epub',
                    disabled: isBusy,
                    className: 'absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed',
                    onChange: handleFileSelected,
                  }),
                  isBusy && !extractedText
                    ? jsxRuntime.jsx(LoadingIndicator, { message: 'Đang đọc file...' })
                    : selectedFile
                      ? jsxRuntime.jsx('div', {
                          className: 'text-sky-300 font-bold break-all',
                          children: selectedFile.name,
                        })
                      : jsxRuntime.jsxs(jsxRuntime.Fragment, {
                          children: [
                            jsxRuntime.jsx('span', { className: 'text-3xl mb-2', children: '📄' }),
                            jsxRuntime.jsx('span', {
                              className: 'text-sm text-slate-400',
                              children: 'Nhấn để chọn file truyện (.txt, .epub)',
                            }),
                          ],
                        }),
                ],
              }),
              errorMessage && jsxRuntime.jsx('p', {
                className: 'text-xs text-red-400 bg-red-900/20 p-2 rounded',
                children: errorMessage,
              }),
              jsxRuntime.jsxs('div', {
                className: extractedText ? '' : 'opacity-50 pointer-events-none',
                children: [
                  jsxRuntime.jsx('label', {
                    className: 'block text-sm font-medium text-slate-300 mb-2',
                    children: 'Độ dài mỗi đoạn (Số từ mục tiêu)',
                  }),
                  jsxRuntime.jsxs('div', {
                    className: 'flex items-center gap-3',
                    children: [
                      jsxRuntime.jsx('input', {
                        type: 'range',
                        min: '500',
                        max: '5000',
                        step: '100',
                        value: targetWordCount,
                        onChange: event => {
                          const nextCount = Number.parseInt(event.target.value, 10);
                          setTargetWordCount(nextCount);
                          if (extractedText) {
                            updateChunkPreview(extractedText, nextCount);
                          }
                        },
                        'aria-label': 'Độ dài mỗi đoạn (Số từ mục tiêu)',
                        className: 'flex-grow h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-sky-500',
                      }),
                      jsxRuntime.jsx('span', {
                        className: 'text-sky-400 font-mono font-bold w-16 text-right',
                        children: targetWordCount,
                      }),
                    ],
                  }),
                  jsxRuntime.jsx('p', {
                    className: 'text-xs text-slate-500 mt-1 italic',
                    children: 'Hệ thống sẽ tự động tìm dấu câu gần nhất để ngắt đoạn, đảm bảo câu văn trọn vẹn (Smart Chunking).',
                  }),
                ],
              }),
              previewLines.length > 0 && jsxRuntime.jsx('div', {
                className: 'bg-slate-900/50 p-3 rounded border border-slate-700 text-xs font-mono text-slate-300 space-y-1 max-h-40 overflow-y-auto custom-scrollbar',
                children: previewLines.map((line, index) => jsxRuntime.jsx('div', {
                  className: 'break-words',
                  children: line,
                }, index)),
              }),
              jsxRuntime.jsxs('div', {
                className: 'flex justify-end gap-3 pt-2',
                children: [
                  jsxRuntime.jsx('button', {
                    ref: cancelButtonRef,
                    onClick: onClose,
                    className: 'px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-bold text-sm ',
                    disabled: isBusy,
                    children: 'Hủy',
                  }),
                  jsxRuntime.jsx('button', {
                    onClick: handleStartStorySession,
                    disabled: !selectedFile || !extractedText || isBusy,
                    className: 'px-6 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-bold text-sm shadow-lg shadow-sky-900/20  flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed',
                    children: isBusy && extractedText
                      ? jsxRuntime.jsx(LoadingIndicator, { message: '' })
                      : 'Vào Game',
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    });
  };
}

export function createSessionListItem(getDependencies) {
  return function SessionListItem({ session, character, onClick, onDelete, onExport }) {
    const { react, relativeTimeUnits, Icon, jsxRuntime } = resolveSessionDependencies(getDependencies);
    const [relativeUpdatedLabel, setRelativeUpdatedLabel] = react.useState('');

    react.useEffect(() => {
      const computeRelativeTime = () => {
        const elapsedSeconds = Math.floor((Date.now() - session.lastUpdated) / 1000);
        if (elapsedSeconds < 5) return 'vừa xong';
        for (const unit of relativeTimeUnits) {
          const count = Math.floor(elapsedSeconds / unit.seconds);
          if (count >= 1) return `${count} ${unit.label} trước`;
        }
        return 'vừa xong';
      };

      setRelativeUpdatedLabel(computeRelativeTime());
      const intervalId = setInterval(() => {
        setRelativeUpdatedLabel(computeRelativeTime());
      }, 60000);
      return () => clearInterval(intervalId);
    }, [session.lastUpdated]);

    const [isMenuOpen, setIsMenuOpen] = react.useState(false);
    const menuRef = react.useRef(null);

    react.useEffect(() => {
      const handleOutsideMouseDown = event => {
        if (isMenuOpen && menuRef.current && !menuRef.current.contains(event.target)) {
          setIsMenuOpen(false);
        }
      };
      document.addEventListener('mousedown', handleOutsideMouseDown);
      return () => document.removeEventListener('mousedown', handleOutsideMouseDown);
    }, [isMenuOpen]);

    const displayName = character?.card.name || session.characterFileName;

    return jsxRuntime.jsxs('div', {
      className: 'bg-slate-800/70 p-4 rounded-lg flex gap-4 items-center hover:bg-slate-700/80   group relative',
      children: [
        jsxRuntime.jsx('button', {
          onClick,
          className: 'w-16 h-16 rounded-full bg-slate-700 flex-shrink-0 overflow-hidden cursor-pointer hover:opacity-80  focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400',
          'aria-label': `Tiếp tục trò chuyện với ${displayName}`,
          children: character?.avatarUrl
            ? jsxRuntime.jsx('img', {
                src: character.avatarUrl,
                alt: '',
                className: 'w-full h-full object-cover',
              })
            : jsxRuntime.jsx('div', {
                className: 'w-full h-full flex items-center justify-center text-slate-400',
                children: jsxRuntime.jsx(Icon, { name: 'character', className: 'h-7 w-7' }),
              }),
        }),
        jsxRuntime.jsxs('div', {
          className: 'flex-grow overflow-hidden flex flex-col items-start',
          children: [
            jsxRuntime.jsx('button', {
              onClick,
              className: 'px-3 py-1 bg-slate-700 hover:bg-sky-600 text-white text-sm font-bold rounded-md  shadow-sm border border-slate-600 hover:border-sky-500 mb-1 max-w-full truncate text-left',
              children: displayName,
            }),
            jsxRuntime.jsx('p', {
              className: 'text-sm text-slate-400 italic truncate w-full',
              children: session.lastMessageSnippet || 'Bắt đầu cuộc trò chuyện...',
            }),
            jsxRuntime.jsx('p', {
              className: 'text-xs text-slate-500 mt-1',
              children: relativeUpdatedLabel,
            }),
          ],
        }),
        jsxRuntime.jsxs('div', {
          ref: menuRef,
          className: 'absolute top-2 right-2',
          children: [
            jsxRuntime.jsx('button', {
              onClick: event => {
                event.stopPropagation();
                setIsMenuOpen(previous => !previous);
              },
              className: 'p-2 rounded-full text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-900/50 hover:text-white  focus:opacity-100',
              'aria-label': 'Tùy chọn cuộc trò chuyện',
              'aria-haspopup': 'true',
              'aria-expanded': isMenuOpen,
              children: jsxRuntime.jsx(Icon, { name: 'more', className: 'h-5 w-5' }),
            }),
            isMenuOpen && jsxRuntime.jsxs('div', {
              className: 'absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-md shadow-lg z-10 py-1',
              children: [
                jsxRuntime.jsxs('button', {
                  onClick: event => {
                    event.stopPropagation();
                    onExport();
                    setIsMenuOpen(false);
                  },
                  className: 'w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-sky-400 hover:bg-sky-500/10 border-b border-slate-700/50',
                  children: [
                    jsxRuntime.jsx(Icon, { name: 'download', className: 'h-4 w-4' }),
                    jsxRuntime.jsx('span', { children: 'Xuất Bản Ghi Phiêu Lưu' }),
                  ],
                }),
                jsxRuntime.jsxs('button', {
                  onClick: event => {
                    event.stopPropagation();
                    onDelete();
                    setIsMenuOpen(false);
                  },
                  className: 'w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10',
                  children: [
                    jsxRuntime.jsx(Icon, { name: 'trash', className: 'h-4 w-4' }),
                    jsxRuntime.jsx('span', { children: 'Xóa cuộc trò chuyện' }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    });
  };
}

export function createSessionListScreen(getDependencies) {
  return function SessionListScreen({ onSessionSelect }) {
    const {
      executeVariableScript,
      personaStore,
      truncateText,
      deleteSessionRecord,
      expandBasicMacros,
      FileNameDialog,
      normalizeCharacterForSave,
      listSavedSessions,
      resolveCharacterName,
      isRecordObject,
      saveSessionRecord,
      expandRandomMacros,
      extractRegexScripts,
      diagnosticsState,
      mergeInitialVariableSources,
      repositories,
      sessionPersistence,
      StorySetupDialog,
      react,
      presetStore,
      resolveWorldInfo,
      CharacterLaunchCard,
      processRegex,
      AdventureImportDropzone,
      useToast,
      yamlParser,
      characterStore,
      deepMergeObject,
      LoadingIndicator,
      GreetingDialog,
      isPlainObject,
      SessionListItem,
      jsxRuntime,
    } = resolveSessionDependencies(getDependencies);

    const [sessions, setSessions] = react.useState([]);
    const [isLoadingSessions, setIsLoadingSessions] = react.useState(true);
    const { characters, isLoading: isLoadingCharacters, reloadCharacters } = characterStore();
    const { presets, activePresetName, reloadPresets } = presetStore();
    const { activePersonaId, activePersona, personas, reloadPersonas } = personaStore();

    const [greetingTargetCharacter, setGreetingTargetCharacter] = react.useState(null);
    const [storyTargetCharacter, setStoryTargetCharacter] = react.useState(null);
    const [errorMessage, setErrorMessage] = react.useState('');
    const [isImportingArchive, setIsImportingArchive] = react.useState(false);
    const { showToast } = useToast();
    const [isExportDialogOpen, setIsExportDialogOpen] = react.useState(false);
    const [sessionToExport, setSessionToExport] = react.useState(null);

    const reloadSavedSessions = async () => {
      setIsLoadingSessions(true);
      try {
        const loadedSessions = await listSavedSessions();
        loadedSessions.sort((left, right) => right.lastUpdated - left.lastUpdated);
        setSessions(loadedSessions);
      } catch {
        setErrorMessage('Không thể tải các phiên trò chuyện đã lưu.');
      } finally {
        setIsLoadingSessions(false);
      }
    };

    react.useEffect(() => {
      reloadSavedSessions();
    }, []);

    const activePreset = presets.find(preset => preset.name === activePresetName);

    const handleDeleteSession = async sessionId => {
      try {
        await deleteSessionRecord(sessionId);
        diagnosticsState.drop(sessionId);
        setSessions(previous => previous.filter(item => item.sessionId !== sessionId));
      } catch {
        setErrorMessage('Không thể xóa phiên trò chuyện.');
      }
    };

    const handleStartNewSession = async (character, greetingTemplate) => {
      if (!activePreset) {
        setErrorMessage('Không có preset nào được chọn. Vui lòng chọn một preset trong tab Preset.');
        setGreetingTargetCharacter(null);
        return;
      }

      const sessionId = character.fileName;
      if (
        sessions.find(item => item.sessionId === sessionId)
        && !window.confirm(
          `Một cuộc trò chuyện với ${character.card.name} đã tồn tại. Bạn có muốn bắt đầu lại từ đầu và xóa cuộc trò chuyện cũ không?`,
        )
      ) {
        setGreetingTargetCharacter(null);
        return;
      }

      const userName = activePersona ? activePersona.name : 'User';
      const characterName = resolveCharacterName(character.card);
      const renderedGreeting = expandRandomMacros(expandBasicMacros(greetingTemplate, {
        card: character.card,
        userName,
        userPersonaDescription: activePersona?.description || '',
        userInput: '',
        messages: [],
      }));

      let {
        displayContent,
        interactiveHtml,
        interactiveHtmlBlocks,
        diagnosticLog,
      } = processRegex(renderedGreeting, character.card.extensions?.regex_scripts || [], [2], {
        isMarkdown: true,
        isPrompt: false,
        depth: 0,
        ...extractRegexScripts(undefined, activePreset),
        macros: { char: characterName, bot: characterName, user: userName },
      });

      const hasEnabledHelperScripts = character.card.extensions?.TavernHelper_scripts?.some(
        script => script?.type === 'script' && script?.value?.enabled,
      );
      if (hasEnabledHelperScripts && !interactiveHtml) {
        interactiveHtml = displayContent || renderedGreeting;
        interactiveHtmlBlocks = interactiveHtml ? [interactiveHtml] : [];
        displayContent = '';
        if (!interactiveHtml.trim()) {
          interactiveHtml = '<div></div>';
        }
      }

      let initialVariables = extractCardExtensionVariables(
        character.card,
        isPlainObject,
        deepMergeObject,
        yamlParser,
      );
      const mergedInit = mergeInitialVariableSources(
        initialVariables,
        character.card.char_book?.entries || [],
        renderedGreeting,
        text => yamlParser.default.parse(text),
      );
      initialVariables = mergedInit.variables;

      let finalVariables = initialVariables;
      try {
        finalVariables = (await executeVariableScript(renderedGreeting, initialVariables)).updatedVariables;
      } catch {}

      const { updatedRuntimeState: initialWorldInfoRuntime } = resolveWorldInfo(
        renderedGreeting,
        character.card.char_book?.entries || [],
        {},
        {},
        {},
      );

      const backgroundAssets = (character.card.assets || []).filter(
        asset => asset.type?.toLowerCase() === 'background',
      );
      const primaryBackground = backgroundAssets.find(asset => asset.name?.toLowerCase() === 'main')
        || backgroundAssets[0];
      const backgroundImageUrl = primaryBackground
        ? (character.card.__embedded_assets?.[primaryBackground.uri]
            || (/^(?:https:|data:|blob:)/i.test(primaryBackground.uri) ? primaryBackground.uri : undefined))
        : undefined;

      const initialHistory = [];
      const openingMessage = {
        id: `msg-start-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        role: 'model',
        content: displayContent.trim() ? displayContent : '',
        originalRawContent: renderedGreeting,
        contextState: JSON.parse(JSON.stringify(finalVariables)),
        timestamp: Date.now(),
      };
      if (interactiveHtml) {
        openingMessage.interactiveHtml = interactiveHtml;
        if (interactiveHtmlBlocks?.length) {
          openingMessage.interactiveHtmlBlocks = interactiveHtmlBlocks;
        }
      }

      if (openingMessage.content || openingMessage.interactiveHtml) {
        initialHistory.push(openingMessage);
      } else if (renderedGreeting) {
        initialHistory.push({
          id: `msg-start-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          role: 'model',
          content: renderedGreeting,
          contextState: JSON.parse(JSON.stringify(finalVariables)),
          timestamp: Date.now(),
        });
      }

      const newSessionRecord = {
        sessionId,
        characterFileName: character.fileName,
        presetName: activePreset.name,
        userPersonaId: activePersonaId,
        chatHistory: initialHistory,
        longTermSummaries: [],
        variables: finalVariables,
        worldInfoRuntime: initialWorldInfoRuntime,
        visualState: backgroundImageUrl ? { backgroundImage: backgroundImageUrl } : {},
        lastMessageSnippet: truncateText(displayContent || renderedGreeting || 'Bắt đầu cuộc trò chuyện...', 50),
        lastUpdated: Date.now(),
      };

      try {
        await saveSessionRecord(newSessionRecord);
        diagnosticsState.drop(sessionId);
        diagnosticsState.activate(sessionId);
        if (diagnosticLog) {
          diagnosticsState.addSystem({
            level: 'log',
            source: 'regex',
            message: String(diagnosticLog),
            timestamp: Date.now(),
          });
        }
        onSessionSelect(sessionId);
      } catch {
        setErrorMessage('Không thể tạo phiên trò chuyện mới.');
      }
      setGreetingTargetCharacter(null);
    };

    const handleImportAdventureArchive = async archiveFile => {
      setIsImportingArchive(true);
      setErrorMessage('');
      try {
        if (!archiveFile.size) {
          throw new Error('Tệp bản ghi trống.');
        }
        if (archiveFile.size > 100000000) {
          throw new Error('Tệp bản ghi vượt quá giới hạn 100 MB.');
        }

        const parsedJson = await new Response(archiveFile).json();
        const {
          character: importedCard,
          characterFileName,
          preset: importedPreset,
          session: rawImportedSession,
          userPersona: importedPersona,
        } = validateAdventureArchive(parsedJson, isRecordObject).data;

        const normalizedSession = sessionPersistence.normalizeLoadedSession({
          ...rawImportedSession,
          characterFileName,
          lastUpdated: Date.now(),
        }).record;

        await repositories.mergeRecords({
          characters: [await normalizeCharacterForSave({
            card: importedCard,
            fileName: characterFileName,
            avatarUrl: null,
            avatarFile: null,
          })],
          presets: importedPreset ? [importedPreset] : [],
          personas: importedPersona ? [importedPersona] : [],
          chatSessions: [normalizedSession],
        });
        diagnosticsState.drop(normalizedSession.sessionId);

        await Promise.all([reloadCharacters(), reloadPresets(), reloadPersonas(), reloadSavedSessions()]);
        showToast('Nhập bản ghi thành công!', 'success');
        onSessionSelect(normalizedSession.sessionId);
      } catch (error) {
        console.error('Import failed', error);
        setErrorMessage(`Lỗi nhập bản ghi: Lỗi khi nhập bản ghi: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setIsImportingArchive(false);
      }
    };

    const handleConfirmExportSession = fileName => {
      if (!sessionToExport) return;
      const targetCharacter = characters.find(item => item.fileName === sessionToExport.characterFileName);
      const targetPersona = personas.find(item => item.id === sessionToExport.userPersonaId) || activePersona;
      let targetPreset = activePreset && activePreset.name === sessionToExport.presetName
        ? activePreset
        : presets.find(item => item.name === sessionToExport.presetName);
      targetPreset ||= activePreset;

      if (!targetCharacter || !targetPreset) {
        alert('Không thể xuất: Dữ liệu nhân vật hoặc preset gốc bị thiếu.');
        return;
      }

      const exportedPreset = {
        ...targetPreset,
        name: `Cài đặt · ${targetCharacter.card.name}`,
      };

      try {
        const archivePayload = {
          version: 1,
          timestamp: Date.now(),
          meta: {
            exportedBy: 'AI Studio Card Tool',
            description: `Bản ghi phiêu lưu: ${targetCharacter.card.name} - ${new Date().toLocaleString()}`,
          },
          data: {
            character: targetCharacter.card,
            characterFileName: sessionToExport.characterFileName,
            preset: exportedPreset,
            session: sessionToExport,
            userPersona: targetPersona,
          },
        };
        const blob = new Blob([JSON.stringify(archivePayload)], { type: 'application/json' });
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(objectUrl);
      } catch (error) {
        console.error(error);
        alert('Lỗi khi tạo bản ghi xuất.');
      }
    };

    const activeCharacterFileNames = new Set(sessions.map(session => session.characterFileName));
    const availableCharacters = characters.filter(character => !activeCharacterFileNames.has(character.fileName));
    const resumableSessions = sessions
      .map(session => ({
        session,
        character: characters.find(character => character.fileName === session.characterFileName),
      }))
      .filter(item => item.character);

    if (isLoadingSessions || isLoadingCharacters) {
      return jsxRuntime.jsx('div', {
        className: 'flex justify-center items-center h-full',
        children: jsxRuntime.jsx(LoadingIndicator, { message: 'Đang tải sảnh trò chuyện...' }),
      });
    }

    const exportDefaultFileName = sessionToExport
      ? `Adventure_${(characters.find(item => item.fileName === sessionToExport.characterFileName)?.card.name || 'Character').replace(/[^a-z0-9]/gi, '_')}_${sessionToExport.sessionId.substring(0, 8)}`
      : 'Adventure';

    return jsxRuntime.jsxs('div', {
      className: 'space-y-10',
      children: [
        errorMessage && jsxRuntime.jsx('p', {
          className: 'text-red-400 text-center bg-red-900/20 p-3 rounded',
          children: errorMessage,
        }),
        jsxRuntime.jsx('div', {
          className: '',
          children: jsxRuntime.jsx(AdventureImportDropzone, {
            onImport: handleImportAdventureArchive,
            isLoading: isImportingArchive,
          }),
        }),
        jsxRuntime.jsxs('div', {
          children: [
            jsxRuntime.jsx('h2', {
              className: 'text-2xl font-bold text-sky-400 mb-4 border-b-2 border-slate-700 pb-2',
              children: 'Tiếp tục nhân vật',
            }),
            resumableSessions.length > 0
              ? jsxRuntime.jsx('div', {
                  className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
                  children: resumableSessions.map(({ session, character }) => jsxRuntime.jsx(SessionListItem, {
                    session,
                    character,
                    onClick: () => onSessionSelect(session.sessionId),
                    onDelete: () => handleDeleteSession(session.sessionId),
                    onExport: () => {
                      setSessionToExport(session);
                      setIsExportDialogOpen(true);
                    },
                  }, session.sessionId)),
                })
              : jsxRuntime.jsx('p', {
                  className: 'text-slate-500 italic',
                  children: 'Không có cuộc trò chuyện nào đang diễn ra.',
                }),
          ],
        }),
        jsxRuntime.jsxs('div', {
          children: [
            jsxRuntime.jsx('h2', {
              className: 'text-2xl font-bold text-sky-400 mb-4 border-b-2 border-slate-700 pb-2',
              children: 'Bắt đầu cuộc phiêu lưu mới',
            }),
            availableCharacters.length > 0
              ? jsxRuntime.jsx('div', {
                  className: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4',
                  children: availableCharacters.map(character => jsxRuntime.jsx(CharacterLaunchCard, {
                    character,
                    onClick: () => setGreetingTargetCharacter(character),
                    onImportStory: event => {
                      event.stopPropagation();
                      if (activePreset) {
                        setStoryTargetCharacter(character);
                      } else {
                        showToast('Vui lòng chọn một Preset trước.', 'error');
                      }
                    },
                  }, character.fileName)),
                })
              : jsxRuntime.jsx('p', {
                  className: 'text-slate-500 italic',
                  children: 'Tất cả các nhân vật đã có cuộc trò chuyện. Tải lên nhân vật mới để bắt đầu cuộc phiêu lưu mới!',
                }),
          ],
        }),
        greetingTargetCharacter && activePreset && jsxRuntime.jsx(GreetingDialog, {
          character: greetingTargetCharacter,
          preset: activePreset,
          onClose: () => setGreetingTargetCharacter(null),
          onStart: greetingText => handleStartNewSession(greetingTargetCharacter, greetingText),
        }),
        storyTargetCharacter && activePreset && jsxRuntime.jsx(StorySetupDialog, {
          character: storyTargetCharacter,
          preset: activePreset,
          onClose: () => setStoryTargetCharacter(null),
          onStart: sessionId => {
            setStoryTargetCharacter(null);
            onSessionSelect(sessionId);
          },
        }),
        jsxRuntime.jsx(FileNameDialog, {
          isOpen: isExportDialogOpen,
          onClose: () => setIsExportDialogOpen(false),
          onConfirm: handleConfirmExportSession,
          initialFileName: exportDefaultFileName,
          title: 'Xuất Bản Ghi Phiêu Lưu',
          fileExtension: '.json',
        }),
      ],
    });
  };
}

export function createArenaSettingsDialog(getDependencies) {
  return function ArenaSettingsDialog({ isOpen, onClose }) {
    const {
      defaultProxyModels,
      ModelTestButton,
      fetchOpenRouterModels,
      defaultGeminiModels,
      useDialogFocus,
      connections,
      proxyPersistence,
      getProxyLegacyMode,
      react,
      getOpenRouterApiKey,
      buildSavedProbeTarget,
      getProxyProfiles,
      catalog,
      useToast,
      useGeminiCatalog,
      LoadingIndicator,
      getConnectionSettings,
      sessionStore,
      getOpenRouterCachedModels,
      testModel,
      getProxyUrl,
      jsxRuntime,
      getProxyPassword,
    } = resolveSessionDependencies(getDependencies);

    const notify = useToast ? useToast().showToast : undefined;
    const {
      arenaProvider,
      setArenaProvider,
      arenaModelId,
      setArenaModelId,
      arenaUserProfileId,
      setArenaUserProfileId,
    } = sessionStore();

    const dialogRef = react.useRef(null);
    const [openRouterModels, setOpenRouterModels] = react.useState([]);
    const [proxyModels, setProxyModels] = react.useState([]);
    const [proxyProfiles, setProxyProfiles] = react.useState([]);
    const { models: geminiModels } = useGeminiCatalog(defaultGeminiModels);
    const [isLoadingModels, setIsLoadingModels] = react.useState(false);
    const [loadError, setLoadError] = react.useState(null);
    const closeButtonRef = react.useRef(null);

    useDialogFocus(isOpen, onClose, dialogRef, closeButtonRef);

    react.useEffect(() => {
      if (isOpen && !arenaProvider) {
        setArenaProvider('gemini');
      }
      if (isOpen) {
        setProxyProfiles(getProxyProfiles());
      }
    }, [isOpen, arenaProvider, setArenaProvider]);

    react.useEffect(() => {
      const handleOutsideMouseDown = event => {
        if (dialogRef.current && !dialogRef.current.contains(event.target)) {
          onClose();
        }
      };
      if (isOpen) {
        document.addEventListener('mousedown', handleOutsideMouseDown);
      }
      return () => document.removeEventListener('mousedown', handleOutsideMouseDown);
    }, [isOpen, onClose]);

    react.useEffect(() => {
      if (!isOpen) return;
      const controller = new AbortController();
      const isCurrent = () => !controller.signal.aborted;
      setIsLoadingModels(true);
      setLoadError(null);
      setProxyModels([]);

      (async () => {
        try {
          if (arenaProvider === 'openrouter') {
            if (!getOpenRouterApiKey()) {
              throw new Error('Chưa cấu hình API Key cho OpenRouter trong Cài đặt chính.');
            }
            setOpenRouterModels(getOpenRouterCachedModels());
            const fetchedModels = await fetchOpenRouterModels();
            if (isCurrent()) {
              setOpenRouterModels(fetchedModels);
            }
          } else if (arenaProvider === 'proxy') {
            const target = resolveCatalogTarget({
              profileId: arenaUserProfileId,
              profiles: getProxyProfiles(),
              global: {
                url: getProxyUrl(),
                password: getProxyPassword(),
                legacyMode: getProxyLegacyMode(),
                protocol: getConnectionSettings().proxy_protocol,
              },
            });
            await refreshDialogProxyCatalog({
              catalog,
              target,
              signal: controller.signal,
              isCurrent,
              publish: setProxyModels,
            });
          }
        } catch {
          if (isCurrent()) {
            setLoadError('Không tải được danh sách model. Kiểm tra cấu hình kết nối.');
          }
        } finally {
          if (isCurrent()) {
            setIsLoadingModels(false);
          }
        }
      })();

      return () => controller.abort();
    }, [arenaProvider, isOpen, arenaUserProfileId, proxyProfiles]);

    const availableModels = react.useMemo(() => {
      if (arenaProvider === 'gemini') return geminiModels;
      if (arenaProvider === 'openrouter') {
        return openRouterModels.map(model => ({
          id: model.id,
          name: `${model.name} (${model.pricing.prompt === '0' ? 'Free' : '$'})`,
        }));
      }
      if (arenaProvider === 'proxy') {
        return proxyModels.length > 0 ? proxyModels : defaultProxyModels;
      }
      return [];
    }, [arenaProvider, openRouterModels, proxyModels, geminiModels]);

    if (!isOpen) return null;

    return jsxRuntime.jsxs('div', {
      ref: dialogRef,
      className: 'absolute top-16 right-4 w-80 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl z-50  flex flex-col max-h-[80vh]',
      role: 'dialog',
      'aria-modal': true,
      'aria-labelledby': 'arena-settings-title',
      children: [
        jsxRuntime.jsxs('div', {
          className: 'p-3 border-b border-slate-700 bg-slate-900/50 rounded-t-xl shrink-0 flex items-center justify-between',
          children: [
            jsxRuntime.jsxs('div', {
              className: 'flex items-center gap-2',
              children: [
                jsxRuntime.jsx('span', { className: 'text-rose-500 font-bold', children: 'VS' }),
                jsxRuntime.jsx('h3', {
                  id: 'arena-settings-title',
                  className: 'text-xs font-bold text-slate-300 uppercase tracking-wider',
                  children: 'Cài đặt Đấu trường',
                }),
              ],
            }),
            jsxRuntime.jsx('button', {
              ref: closeButtonRef,
              onClick: onClose,
              className: 'text-slate-400 hover:text-white',
              'aria-label': 'Đóng cài đặt Đấu trường',
              children: '✕',
            }),
          ],
        }),
        jsxRuntime.jsxs('div', {
          className: 'p-4 space-y-4 overflow-y-auto custom-scrollbar',
          children: [
            jsxRuntime.jsxs('div', {
              className: 'space-y-2',
              children: [
                jsxRuntime.jsx('label', {
                  className: 'text-[10px] font-bold text-indigo-400 uppercase',
                  children: 'Nhà cung cấp (Đối thủ)',
                }),
                jsxRuntime.jsx('div', {
                  className: 'flex bg-slate-900 rounded-lg p-1 border border-slate-700',
                  role: 'group',
                  'aria-label': 'Nhà cung cấp đối thủ',
                  children: ['gemini', 'openrouter', 'proxy'].map(providerId => jsxRuntime.jsx('button', {
                    onClick: () => setArenaProvider(providerId),
                    'aria-pressed': arenaProvider === providerId,
                    className: `flex-1 py-1.5 text-xs font-bold rounded  ${
                      arenaProvider === providerId
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`,
                    children: providerId === 'gemini' ? 'Gemini' : (providerId === 'openrouter' ? 'OR' : 'Proxy'),
                  }, providerId)),
                }),
              ],
            }),
            arenaProvider === 'proxy' && jsxRuntime.jsxs('div', {
              className: 'space-y-2 ',
              children: [
                jsxRuntime.jsx('label', {
                  className: 'text-[10px] font-bold text-emerald-400 uppercase',
                  children: 'Cấu hình Proxy (Profile)',
                }),
                jsxRuntime.jsxs('select', {
                  value: arenaUserProfileId || '',
                  'aria-label': 'Cấu hình Proxy đối thủ',
                  onChange: event => setArenaUserProfileId(event.target.value || null),
                  className: 'w-full bg-slate-900 border border-slate-600 rounded text-xs p-2 text-white focus:border-emerald-500 outline-none',
                  children: [
                    jsxRuntime.jsx('option', { value: '', children: '-- Mặc định (Global Settings) --' }),
                    proxyProfiles.map(profile => jsxRuntime.jsx('option', {
                      value: profile.id,
                      children: profile.name,
                    }, profile.id)),
                  ],
                }),
              ],
            }),
            jsxRuntime.jsxs('div', {
              className: 'space-y-2',
              children: [
                jsxRuntime.jsx('label', {
                  className: 'text-[10px] font-bold text-sky-400 uppercase',
                  children: 'Model Đối thủ',
                }),
                isLoadingModels
                  ? jsxRuntime.jsx('div', {
                      className: 'py-2 flex justify-center',
                      children: jsxRuntime.jsx(LoadingIndicator, { message: 'Đang tải danh sách...' }),
                    })
                  : loadError
                    ? jsxRuntime.jsx('div', {
                        className: 'text-xs text-red-400 bg-red-900/20 p-2 rounded border border-red-900/50',
                        children: loadError,
                      })
                    : jsxRuntime.jsxs('div', {
                        className: 'flex items-center gap-2',
                        children: [
                          jsxRuntime.jsxs('select', {
                            value: arenaModelId || '',
                            'aria-label': 'Model đối thủ',
                            onChange: event => setArenaModelId(event.target.value),
                            className: 'flex-1 min-w-0 bg-slate-900 border border-slate-600 rounded text-xs p-2 text-white focus:border-rose-500 outline-none',
                            children: [
                              jsxRuntime.jsx('option', { value: '', children: '-- Chọn Model --' }),
                              availableModels.map(model => jsxRuntime.jsx('option', {
                                value: model.id,
                                children: model.name,
                              }, model.id)),
                            ],
                          }),
                          ModelTestButton && buildSavedProbeTarget && testModel && jsxRuntime.jsx(ModelTestButton, {
                            target: buildSavedProbeTarget({
                              provider: arenaProvider || 'gemini',
                              model: arenaModelId || '',
                              profileId: arenaUserProfileId || '',
                              connections,
                              proxyPersistence,
                              proxy: {
                                url: getProxyUrl(),
                                password: getProxyPassword(),
                                legacyMode: getProxyLegacyMode(),
                                protocol: getConnectionSettings().proxy_protocol,
                              },
                            }),
                            testModel,
                            notify,
                          }),
                        ],
                      }),
              ],
            }),
            jsxRuntime.jsx('div', {
              className: 'text-[10px] text-slate-500 italic',
              children: '* Lưu ý: Cấu hình chi tiết (API Key, URL) được lấy từ Cài đặt chính hoặc Profile đã chọn.',
            }),
          ],
        }),
      ],
    });
  };
}

export function createChatSettingsDialog(getDependencies) {
  return function ChatSettingsDialog({
    isOpen,
    onClose,
    visualState,
    onUpdate,
    isHUDOpen,
    onToggleHUD,
    isStatusHUDOpen,
    onToggleStatusHUD,
  }) {
    const {
      useDialogFocus,
      react,
      Icon,
      jsxRuntime,
      ToggleSwitch,
    } = resolveSessionDependencies(getDependencies);

    const dialogRef = react.useRef(null);
    const closeButtonRef = react.useRef(null);
    useDialogFocus(isOpen, onClose, dialogRef, closeButtonRef);

    if (!isOpen) return null;

    return jsxRuntime.jsxs('div', {
      ref: dialogRef,
      className: 'absolute top-14 right-4 w-80 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl z-50  p-4 max-h-[80vh] overflow-y-auto custom-scrollbar',
      role: 'dialog',
      'aria-modal': true,
      'aria-labelledby': 'chat-settings-title',
      children: [
        jsxRuntime.jsxs('div', {
          className: 'flex justify-between items-center mb-4 border-b border-slate-700 pb-2',
          children: [
            jsxRuntime.jsx('h3', {
              id: 'chat-settings-title',
              className: 'font-bold text-slate-200',
              children: 'Cài đặt Trò chuyện',
            }),
            jsxRuntime.jsx('button', {
              ref: closeButtonRef,
              onClick: onClose,
              className: 'text-slate-400 hover:text-white',
              'aria-label': 'Đóng cài đặt',
              children: jsxRuntime.jsx(Icon, { name: 'close', className: 'h-4 w-4' }),
            }),
          ],
        }),
        jsxRuntime.jsxs('div', {
          className: 'space-y-6',
          children: [
            jsxRuntime.jsxs('div', {
              className: 'space-y-3',
              children: [
                jsxRuntime.jsx('h4', {
                  className: 'text-xs font-bold text-indigo-400 uppercase tracking-wider border-b border-slate-700/50 pb-1',
                  children: 'Công cụ hiển thị',
                }),
                onToggleHUD && jsxRuntime.jsx(ToggleSwitch, {
                  label: 'Bảng Gỡ lỗi (Debug Panel)',
                  checked: Boolean(isHUDOpen),
                  onChange: () => onToggleHUD(),
                  clean: true,
                }),
                onToggleStatusHUD && jsxRuntime.jsx(ToggleSwitch, {
                  label: 'Giao diện Thẻ nổi (Floating HUD)',
                  checked: Boolean(isStatusHUDOpen),
                  onChange: () => onToggleStatusHUD(),
                  clean: true,
                }),
                jsxRuntime.jsx(ToggleSwitch, {
                  label: 'Chế độ Văn bản thuần',
                  checked: Boolean(visualState.disableInteractiveMode),
                  onChange: checked => onUpdate('disableInteractiveMode', checked),
                  clean: true,
                  tooltip: 'Tắt xử lý Regex/Script/HTML. Hiển thị nội dung thô nguyên bản trong bong bóng chat.',
                }),
              ],
            }),
            jsxRuntime.jsxs('div', {
              className: 'space-y-4',
              children: [
                jsxRuntime.jsx('h4', {
                  className: 'text-xs font-bold text-sky-400 uppercase tracking-wider border-b border-slate-700/50 pb-1',
                  children: 'Giao diện & Hình ảnh',
                }),
                jsxRuntime.jsxs('div', {
                  children: [
                    jsxRuntime.jsx('label', {
                      className: 'block text-xs font-medium text-slate-400 mb-1',
                      children: 'Link Hình nền (URL)',
                    }),
                    jsxRuntime.jsx('input', {
                      type: 'text',
                      value: visualState.backgroundImage || '',
                      'aria-label': 'Link hình nền',
                      onChange: event => onUpdate('bg', event.target.value),
                      placeholder: 'https://...',
                      className: 'w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-xs text-slate-200 focus:border-sky-500 focus:outline-none',
                    }),
                    jsxRuntime.jsx('button', {
                      onClick: () => onUpdate('bg', 'off'),
                      className: 'text-xs text-red-400 mt-1 hover:underline',
                      children: 'Xóa nền',
                    }),
                  ],
                }),
                jsxRuntime.jsxs('div', {
                  children: [
                    jsxRuntime.jsx('label', {
                      className: 'block text-xs font-medium text-slate-400 mb-1',
                      children: 'Link Nhạc nền (URL)',
                    }),
                    jsxRuntime.jsx('input', {
                      type: 'text',
                      value: visualState.musicUrl || '',
                      'aria-label': 'Link nhạc nền',
                      onChange: event => onUpdate('music', event.target.value),
                      placeholder: 'https://... (mp3/ogg)',
                      className: 'w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-xs text-slate-200 focus:border-sky-500 focus:outline-none',
                    }),
                    jsxRuntime.jsx('button', {
                      onClick: () => onUpdate('music', 'off'),
                      className: 'text-xs text-red-400 mt-1 hover:underline',
                      children: 'Tắt nhạc',
                    }),
                  ],
                }),
                jsxRuntime.jsxs('div', {
                  children: [
                    jsxRuntime.jsx('label', {
                      className: 'block text-xs font-medium text-slate-400 mb-1',
                      children: 'Hiệu ứng CSS Global',
                    }),
                    jsxRuntime.jsx('input', {
                      type: 'text',
                      value: visualState.globalClass || '',
                      'aria-label': 'Hiệu ứng CSS Global',
                      onChange: event => onUpdate('class', event.target.value),
                      placeholder: 'grayscale, blur-sm, sepia...',
                      className: 'w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-xs text-slate-200 focus:border-sky-500 focus:outline-none',
                    }),
                  ],
                }),
              ],
            }),
            jsxRuntime.jsxs('div', {
              className: 'space-y-4',
              children: [
                jsxRuntime.jsxs('div', {
                  className: 'flex items-center justify-between border-b border-slate-700/50 pb-1',
                  children: [
                    jsxRuntime.jsx('h4', {
                      className: 'text-xs font-bold text-amber-400 uppercase tracking-wider',
                      children: 'Cấu hình Âm thanh',
                    }),
                    jsxRuntime.jsx(ToggleSwitch, {
                      checked: visualState.systemSoundEnabled !== false,
                      ariaLabel: 'Bật âm thanh hệ thống',
                      onChange: checked => onUpdate('systemSoundEnabled', checked),
                      clean: true,
                      className: 'scale-90 origin-right',
                    }),
                  ],
                }),
                jsxRuntime.jsxs('div', {
                  className: visualState.systemSoundEnabled === false ? 'opacity-50 pointer-events-none' : '',
                  children: [
                    jsxRuntime.jsxs('div', {
                      className: 'mb-3',
                      children: [
                        jsxRuntime.jsx('label', {
                          className: 'block text-xs font-medium text-slate-400 mb-1',
                          children: 'Âm thanh AI Xong (URL)',
                        }),
                        jsxRuntime.jsx('input', {
                          type: 'text',
                          value: visualState.aiSoundUrl || '',
                          'aria-label': 'Âm thanh AI xong',
                          onChange: event => onUpdate('aiSoundUrl', event.target.value),
                          placeholder: "Mặc định: 'Pop'",
                          className: 'w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-xs text-slate-200 focus:border-sky-500 focus:outline-none',
                        }),
                      ],
                    }),
                    jsxRuntime.jsxs('div', {
                      children: [
                        jsxRuntime.jsx('label', {
                          className: 'block text-xs font-medium text-slate-400 mb-1',
                          children: 'Âm thanh RPG Xong (URL)',
                        }),
                        jsxRuntime.jsx('input', {
                          type: 'text',
                          value: visualState.rpgSoundUrl || '',
                          'aria-label': 'Âm thanh RPG xong',
                          onChange: event => onUpdate('rpgSoundUrl', event.target.value),
                          placeholder: "Mặc định: 'Magic Chime'",
                          className: 'w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-xs text-slate-200 focus:border-sky-500 focus:outline-none',
                        }),
                      ],
                    }),
                    jsxRuntime.jsx('p', {
                      className: 'text-[10px] text-slate-500 mt-2 italic',
                      children: 'Để trống để sử dụng âm thanh mặc định của hệ thống.',
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    });
  };
}

export function createQuickConnectionDialog(getDependencies) {
  return function QuickConnectionDialog({
    isOpen,
    onClose,
    activePresetName,
    onPresetChange,
    activePersonaId,
    onPersonaChange,
    onConnectionChange,
  }) {
    const {
      personaStore,
      defaultProxyModels,
      ModelTestButton,
      defaultGeminiModels,
      useDialogFocus,
      connections,
      proxyPersistence,
      getProxyLegacyMode,
      react,
      presetStore,
      buildSavedProbeTarget,
      getProxyProfiles,
      catalog,
      useToast,
      useGeminiCatalog,
      Icon,
      getConnectionSettings,
      getOpenRouterCachedModels,
      saveConnectionSettings,
      saveProfiles,
      testModel,
      getProxyUrl,
      jsxRuntime,
      getProxyPassword,
    } = resolveSessionDependencies(getDependencies);

    const { presets } = presetStore();
    const { personas } = personaStore();
    const { showToast } = useToast();
    const dialogRef = react.useRef(null);
    const closeButtonRef = react.useRef(null);

    const [connectionSettings, setConnectionSettings] = react.useState(getConnectionSettings());
    const [proxyModels, setProxyModels] = react.useState([]);
    const [openRouterModels, setOpenRouterModels] = react.useState([]);
    const [proxyProfiles, setProxyProfiles] = react.useState([]);
    const [isLoadingProxyModels, setIsLoadingProxyModels] = react.useState(false);
    const { models: geminiModels } = useGeminiCatalog(defaultGeminiModels);

    useDialogFocus(isOpen, onClose, dialogRef, closeButtonRef);

    react.useEffect(() => {
      if (isOpen) {
        setConnectionSettings(getConnectionSettings());
        setProxyProfiles(getProxyProfiles());
        setProxyModels([]);
        setOpenRouterModels(getOpenRouterCachedModels());
      }
    }, [isOpen]);

    react.useEffect(() => {
      if (!isOpen || connectionSettings.source !== 'proxy') {
        setIsLoadingProxyModels(false);
        return;
      }
      const controller = new AbortController();
      const isCurrent = () => !controller.signal.aborted;
      setIsLoadingProxyModels(true);
      setProxyModels([]);

      (async () => {
        try {
          const target = resolveCatalogTarget({
            profileId: connectionSettings.proxy_profile_id,
            profiles: getProxyProfiles(),
            global: {
              url: getProxyUrl(),
              password: getProxyPassword(),
              legacyMode: getProxyLegacyMode(),
              protocol: connectionSettings.proxy_protocol,
            },
          });
          await refreshDialogProxyCatalog({
            catalog,
            target,
            signal: controller.signal,
            isCurrent,
            publish: setProxyModels,
          });
        } catch {
          if (isCurrent()) {
            showToast('Không tải được model Proxy. Kiểm tra cấu hình kết nối.', 'error');
          }
        } finally {
          if (isCurrent()) {
            setIsLoadingProxyModels(false);
          }
        }
      })();

      return () => controller.abort();
    }, [connectionSettings.source, connectionSettings.proxy_profile_id, connectionSettings.proxy_protocol, isOpen]);

    react.useEffect(() => {
      const handleOutsideMouseDown = event => {
        if (dialogRef.current && !dialogRef.current.contains(event.target)) {
          onClose();
        }
      };
      if (isOpen) {
        document.addEventListener('mousedown', handleOutsideMouseDown);
      }
      return () => document.removeEventListener('mousedown', handleOutsideMouseDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const modelOptions = connectionSettings.source === 'gemini'
      ? geminiModels
      : (connectionSettings.source === 'openrouter'
          ? openRouterModels.map(model => ({
              id: model.id,
              name: `${model.name} (${model.pricing?.prompt === '0' ? 'Free' : '$'})`,
            }))
          : (proxyModels.length > 0 ? proxyModels : defaultProxyModels));

    const currentModelValue = resolveSelectedQuickModel(connectionSettings, proxyProfiles);

    const handleSourceChange = event => {
      const nextSettings = { ...connectionSettings, source: event.target.value };
      saveConnectionSettings(nextSettings);
      setConnectionSettings(nextSettings);
      onConnectionChange();
    };

    const handleProxyProfileChange = event => {
      const nextSettings = {
        ...connectionSettings,
        proxy_profile_id: event.target.value || undefined,
      };
      saveConnectionSettings(nextSettings);
      setConnectionSettings(nextSettings);
      onConnectionChange();
    };

    const handleModelChange = event => {
      const nextModelId = event.target.value;
      const nextSettings = { ...connectionSettings };
      if (connectionSettings.source === 'aistudio') {
        nextSettings.aistudio_model = nextModelId;
      } else if (connectionSettings.source === 'gemini') {
        nextSettings.gemini_model = nextModelId;
      } else if (connectionSettings.source === 'proxy') {
        nextSettings.proxy_model = nextModelId;
      } else if (connectionSettings.source === 'openrouter') {
        nextSettings.openrouter_model = nextModelId;
      }

      if (connectionSettings.source === 'proxy' && connectionSettings.proxy_profile_id) {
        try {
          const currentProfiles = getProxyProfiles();
          if (!currentProfiles.some(profile => profile.id === connectionSettings.proxy_profile_id)) {
            throw new Error('Profile không tồn tại');
          }
          const updatedProfiles = currentProfiles.map(profile => (
            profile.id === connectionSettings.proxy_profile_id
              ? { ...profile, chatModel: nextModelId }
              : profile
          ));
          saveProfiles(updatedProfiles);
          setProxyProfiles(updatedProfiles);
          onConnectionChange();
        } catch {
          showToast('Không lưu được model Proxy.', 'error');
        }
        return;
      }

      saveConnectionSettings(nextSettings);
      setConnectionSettings(nextSettings);
      onConnectionChange();
    };

    return jsxRuntime.jsxs('div', {
      ref: dialogRef,
      className: 'absolute top-14 left-16 md:left-auto md:right-1/4 w-72 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl z-50  flex flex-col max-h-[70vh]',
      role: 'dialog',
      'aria-modal': true,
      'aria-labelledby': 'quick-settings-title',
      children: [
        jsxRuntime.jsxs('div', {
          className: 'p-3 border-b border-slate-700 bg-slate-900/50 rounded-t-xl shrink-0 flex items-center justify-between gap-2',
          children: [
            jsxRuntime.jsx(Icon, { name: 'settings', className: 'h-4 w-4 text-sky-400' }),
            jsxRuntime.jsx('h3', {
              id: 'quick-settings-title',
              className: 'text-xs font-bold text-slate-300 uppercase tracking-wider',
              children: 'Cấu hình Nhanh',
            }),
            jsxRuntime.jsx('button', {
              ref: closeButtonRef,
              onClick: onClose,
              className: 'text-slate-400 hover:text-white',
              'aria-label': 'Đóng cấu hình nhanh',
              children: '✕',
            }),
          ],
        }),
        jsxRuntime.jsxs('div', {
          className: 'overflow-y-auto custom-scrollbar p-3 space-y-4',
          children: [
            jsxRuntime.jsxs('div', {
              className: 'space-y-2',
              children: [
                jsxRuntime.jsx('label', {
                  className: 'text-[10px] font-bold text-indigo-400 uppercase',
                  children: 'Nguồn & Model (Brain)',
                }),
                jsxRuntime.jsxs('div', {
                  className: 'flex items-center gap-2',
                  children: [
                    jsxRuntime.jsx('span', { className: 'text-xs text-slate-400 w-12 shrink-0', children: 'Nguồn:' }),
                    jsxRuntime.jsxs('select', {
                      value: connectionSettings.source,
                      'aria-label': 'Nguồn mô hình',
                      onChange: handleSourceChange,
                      className: 'flex-grow bg-slate-900 border border-slate-600 rounded text-xs p-1.5 text-white focus:border-indigo-500 outline-none',
                      children: [
                        jsxRuntime.jsx('option', { value: 'gemini', children: 'Google Gemini' }),
                        jsxRuntime.jsx('option', { value: 'openrouter', children: 'OpenRouter' }),
                        jsxRuntime.jsx('option', { value: 'proxy', children: 'Proxy' }),
                        jsxRuntime.jsx('option', { value: 'aistudio', children: 'Google / AI Studio' }),
                      ],
                    }),
                  ],
                }),
                connectionSettings.source === 'proxy' && jsxRuntime.jsxs('div', {
                  className: 'flex items-center gap-2 ',
                  children: [
                    jsxRuntime.jsx('span', { className: 'text-xs text-emerald-400 w-12 shrink-0', children: 'Profile:' }),
                    jsxRuntime.jsxs('select', {
                      value: connectionSettings.proxy_profile_id || '',
                      'aria-label': 'Cấu hình proxy',
                      onChange: handleProxyProfileChange,
                      className: 'flex-grow bg-slate-900 border border-slate-600 rounded text-xs p-1.5 text-white focus:border-emerald-500 outline-none',
                      children: [
                        jsxRuntime.jsx('option', { value: '', children: '-- Mặc định (Global) --' }),
                        proxyProfiles.map(profile => jsxRuntime.jsx('option', {
                          value: profile.id,
                          children: profile.name,
                        }, profile.id)),
                      ],
                    }),
                  ],
                }),
                jsxRuntime.jsxs('div', {
                  className: 'flex items-center gap-2',
                  children: [
                    jsxRuntime.jsx('span', { className: 'text-xs text-slate-400 w-12 shrink-0', children: 'Model:' }),
                    jsxRuntime.jsxs('div', {
                      className: 'flex-grow min-w-0 relative',
                      children: [
                        jsxRuntime.jsxs('select', {
                          value: currentModelValue,
                          'aria-label': 'Mô hình',
                          onChange: handleModelChange,
                          disabled: isLoadingProxyModels,
                          className: 'w-full bg-slate-900 border border-slate-600 rounded text-xs p-1.5 text-white focus:border-indigo-500 outline-none disabled:opacity-50',
                          children: [
                            jsxRuntime.jsx('option', { value: '', children: '-- Chọn Model --' }),
                            (connectionSettings.source === 'aistudio'
                              ? [{
                                  id: connectionSettings.aistudio_model || 'gemini-2.5-flash',
                                  name: connectionSettings.aistudio_model || 'gemini-2.5-flash',
                                }]
                              : modelOptions
                            ).map(model => jsxRuntime.jsx('option', {
                              value: model.id,
                              children: model.name,
                            }, model.id)),
                          ],
                        }),
                        isLoadingProxyModels && jsxRuntime.jsx('div', {
                          className: 'absolute right-6 top-1/2 -translate-y-1/2',
                          children: jsxRuntime.jsx('div', {
                            className: 'w-3 h-3 border-2 border-sky-400 border-t-transparent rounded-full ',
                          }),
                        }),
                      ],
                    }),
                    ModelTestButton && buildSavedProbeTarget && testModel && jsxRuntime.jsx(ModelTestButton, {
                      target: buildSavedProbeTarget({
                        provider: connectionSettings.source,
                        model: currentModelValue,
                        profileId: connectionSettings.proxy_profile_id || '',
                        connections,
                        proxyPersistence,
                        proxy: {
                          url: getProxyUrl(),
                          password: getProxyPassword(),
                          legacyMode: getProxyLegacyMode(),
                          protocol: connectionSettings.proxy_protocol,
                        },
                      }),
                      testModel,
                      notify: showToast,
                    }),
                  ],
                }),
              ],
            }),
            jsxRuntime.jsx('div', { className: 'h-px bg-slate-700/50' }),
            jsxRuntime.jsxs('div', {
              className: 'space-y-1',
              children: [
                jsxRuntime.jsx('label', {
                  className: 'text-[10px] font-bold text-emerald-400 uppercase mb-2 block',
                  children: 'Persona (Hồ sơ)',
                }),
                jsxRuntime.jsxs('div', {
                  className: 'max-h-40 overflow-y-auto custom-scrollbar space-y-1 pr-1',
                  children: [
                    jsxRuntime.jsxs('button', {
                      onClick: () => {
                        if (onPersonaChange) onPersonaChange('');
                        onClose();
                      },
                      className: `w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium  flex items-center justify-between ${
                        activePersonaId
                          ? 'text-slate-400 hover:bg-slate-700 hover:text-white border border-transparent'
                          : 'bg-emerald-900/30 text-emerald-100 border border-emerald-500/30'
                      }`,
                      'aria-label': 'Không chọn hồ sơ nào',
                      children: [
                        jsxRuntime.jsx('span', { className: 'truncate italic', children: '-- Không chọn --' }),
                        !activePersonaId && jsxRuntime.jsx('span', {
                          className: 'text-[8px] text-emerald-400',
                          children: '●',
                        }),
                      ],
                    }),
                    personas.map(persona => jsxRuntime.jsxs('button', {
                      onClick: () => {
                        if (onPersonaChange) onPersonaChange(persona.id);
                        onClose();
                      },
                      className: `w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium  flex items-center justify-between ${
                        activePersonaId === persona.id
                          ? 'bg-emerald-900/30 text-emerald-100 border border-emerald-500/30'
                          : 'text-slate-400 hover:bg-slate-700 hover:text-white border border-transparent'
                      }`,
                      'aria-label': `Chọn hồ sơ ${persona.name}`,
                      children: [
                        jsxRuntime.jsx('span', { className: 'truncate', children: persona.name }),
                        activePersonaId === persona.id && jsxRuntime.jsx('span', {
                          className: 'text-[8px] text-emerald-400',
                          children: '●',
                        }),
                      ],
                    }, persona.id)),
                  ],
                }),
              ],
            }),
            jsxRuntime.jsx('div', { className: 'h-px bg-slate-700/50' }),
            jsxRuntime.jsxs('div', {
              className: 'space-y-1',
              children: [
                jsxRuntime.jsx('label', {
                  className: 'text-[10px] font-bold text-amber-400 uppercase mb-2 block',
                  children: 'Preset (Soul)',
                }),
                jsxRuntime.jsx('div', {
                  className: 'max-h-40 overflow-y-auto custom-scrollbar space-y-1 pr-1',
                  children: presets.map(preset => jsxRuntime.jsxs('button', {
                    onClick: () => {
                      if (onPresetChange) onPresetChange(preset.name);
                      onClose();
                    },
                    className: `w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium  flex items-center justify-between ${
                      activePresetName === preset.name
                        ? 'bg-amber-900/30 text-amber-100 border border-amber-500/30'
                        : 'text-slate-400 hover:bg-slate-700 hover:text-white border border-transparent'
                    }`,
                    'aria-label': `Chọn preset ${preset.name}`,
                    children: [
                      jsxRuntime.jsx('span', { className: 'truncate', children: preset.name }),
                      activePresetName === preset.name && jsxRuntime.jsx('span', {
                        className: 'text-[8px] text-amber-400',
                        children: '●',
                      }),
                    ],
                  }, preset.name)),
                }),
              ],
            }),
          ],
        }),
      ],
    });
  };
}

export function createSpeechControls(getDependencies) {
  return function SpeechControls() {
    const { Icon, useSpeech, jsxRuntime } = resolveSessionDependencies(getDependencies);
    const {
      isPlaying,
      isPaused,
      autoPlayEnabled,
      toggleAutoPlay,
      togglePause,
      skip,
      isLoading,
      settings: speechSettings,
    } = useSpeech();

    if (!speechSettings.tts_enabled) return null;

    return jsxRuntime.jsxs('div', {
      className: 'flex items-center bg-slate-800/80 rounded-full px-2 py-1 gap-1 border border-slate-600/50 mr-2',
      children: [
        jsxRuntime.jsx('button', {
          onClick: toggleAutoPlay,
          className: `p-1.5 rounded-full  ${
            autoPlayEnabled ? 'text-sky-400 bg-sky-900/20' : 'text-slate-500 hover:text-slate-300'
          }`,
          title: autoPlayEnabled ? 'Tự động đọc: BẬT' : 'Tự động đọc: TẮT',
          'aria-label': autoPlayEnabled ? 'Tắt tự động đọc' : 'Bật tự động đọc',
          'aria-pressed': autoPlayEnabled,
          children: jsxRuntime.jsx(Icon, { name: 'volume', className: 'h-4 w-4' }),
        }),
        (isPlaying || isPaused || isLoading) && jsxRuntime.jsxs(jsxRuntime.Fragment, {
          children: [
            jsxRuntime.jsx('div', { className: 'w-px h-3 bg-slate-600 mx-1' }),
            jsxRuntime.jsx('button', {
              onClick: togglePause,
              className: `p-1.5 rounded-full text-slate-200 hover:text-white hover:bg-slate-700  ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`,
              title: isPaused ? 'Tiếp tục' : 'Tạm dừng',
              'aria-label': isPaused ? 'Tiếp tục đọc' : 'Tạm dừng đọc',
              disabled: isLoading,
              children: isLoading
                ? jsxRuntime.jsx('span', { className: 'text-sm font-bold', children: '…' })
                : isPaused
                  ? jsxRuntime.jsx(Icon, { name: 'play', className: 'h-4 w-4' })
                  : jsxRuntime.jsx(Icon, { name: 'pause', className: 'h-4 w-4' }),
            }),
            jsxRuntime.jsx('button', {
              onClick: skip,
              className: 'p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 ',
              title: 'Bỏ qua (Next)',
              'aria-label': 'Bỏ qua câu hiện tại',
              children: jsxRuntime.jsx(Icon, { name: 'skip', className: 'h-4 w-4' }),
            }),
          ],
        }),
      ],
    });
  };
}

export function createQuickConnectionBadge(getDependencies) {
  return function QuickConnectionBadge({ presetName, onClick }) {
    const {
      getActiveModelDisplayName,
      Icon,
      getConnectionSettings,
      jsxRuntime,
    } = resolveSessionDependencies(getDependencies);

    const connectionSettings = getConnectionSettings();
    const activeModelLabel = getActiveModelDisplayName();
    const theme = connectionSettings.source === 'openrouter'
      ? {
          bg: 'bg-purple-900/40 hover:bg-purple-900/60',
          border: 'border-purple-500/30',
          text: 'text-purple-200',
        }
      : connectionSettings.source === 'proxy'
        ? {
            bg: 'bg-cyan-900/40 hover:bg-cyan-900/60',
            border: 'border-cyan-500/30',
            text: 'text-cyan-200',
          }
        : {
            bg: 'bg-sky-900/40 hover:bg-sky-900/60',
            border: 'border-sky-500/30',
            text: 'text-sky-200',
          };

    const sourceTag = connectionSettings.source === 'openrouter'
      ? 'OR'
      : (connectionSettings.source === 'proxy' ? 'PRX' : 'AI');

    return jsxRuntime.jsxs('button', {
      onClick,
      className: `group flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium   ${theme.bg} ${theme.border} ${theme.text} max-w-[280px] sm:max-w-[350px] shadow-sm`,
      title: 'Nhấn để cấu hình Nhanh (Model & Preset)',
      children: [
        jsxRuntime.jsxs('div', {
          className: 'flex items-center gap-1.5 shrink-0 min-w-0 max-w-[60%]',
          children: [
            jsxRuntime.jsx('span', {
              className: 'opacity-60 text-[9px] uppercase tracking-wider font-bold',
              children: sourceTag,
            }),
            jsxRuntime.jsx('span', {
              className: 'truncate font-bold',
              children: activeModelLabel,
            }),
          ],
        }),
        jsxRuntime.jsx('div', { className: `w-px h-3 ${theme.text} opacity-20` }),
        jsxRuntime.jsxs('div', {
          className: 'flex items-center gap-1.5 shrink-0 min-w-0 max-w-[40%]',
          children: [
            jsxRuntime.jsx('span', {
              className: 'text-xs font-bold',
              children: jsxRuntime.jsx(Icon, { name: 'preset', className: 'h-3.5 w-3.5' }),
            }),
            jsxRuntime.jsx('span', {
              className: 'truncate opacity-90',
              children: presetName || 'Default',
            }),
          ],
        }),
      ],
    });
  };
}

export function createChatHeader(getDependencies) {
  return function ChatHeader({
    characterName,
    onBack,
    isImmersive,
    visualState,
    onVisualUpdate,
    onToggleHUD,
    isHUDOpen,
    onToggleStatusHUD,
    isStatusHUDOpen,
    activePresetName,
    onPresetChange,
    activePersonaId,
    onPersonaChange,
    onToggleAssistant,
    isAssistantOpen,
    onToggleRpgDashboard,
    isRpgDashboardOpen,
    hasRpgData,
    onSyncLorebook,
    isSyncingLorebook,
  }) {
    const {
      react,
      ArenaSettingsDialog,
      QuickConnectionDialog,
      SpeechControls,
      Icon,
      sessionStore,
      QuickConnectionBadge,
      ChatSettingsDialog,
      jsxRuntime,
    } = resolveSessionDependencies(getDependencies);

    const [isSettingsOpen, setIsSettingsOpen] = react.useState(false);
    const [isQuickConnectionOpen, setIsQuickConnectionOpen] = react.useState(false);
    const [isArenaSettingsOpen, setIsArenaSettingsOpen] = react.useState(false);
    const [connectionRefreshKey, setConnectionRefreshKey] = react.useState(0);
    const settingsButtonRef = react.useRef(null);
    const { isArenaMode, setArenaMode, arenaModelId } = sessionStore();

    return jsxRuntime.jsxs('div', {
      className: isImmersive
        ? 'chat-topbar p-3 bg-slate-900/60 border-b border-white/10 flex items-center gap-4 relative z-10 hover:bg-slate-900/80'
        : 'chat-topbar p-3 border-b border-slate-700 flex items-center gap-4 relative z-10 bg-slate-800/80',
      children: [
        jsxRuntime.jsx('button', {
          onClick: onBack,
          className: 'chat-icon-button text-slate-400 hover:text-sky-400',
          title: 'Quay lại',
          'aria-label': 'Quay lại sảnh chờ',
          children: jsxRuntime.jsx(Icon, { name: 'arrowLeft', className: 'h-5 w-5' }),
        }),
        jsxRuntime.jsxs('div', {
          className: 'flex-grow min-w-0 flex flex-col justify-center',
          children: [
            jsxRuntime.jsx('div', {
              className: 'flex items-center gap-2 mb-0.5',
              children: jsxRuntime.jsx('h2', {
                className: 'text-lg font-bold text-slate-200 truncate',
                children: characterName,
              }),
            }),
            !isImmersive && jsxRuntime.jsxs('div', {
              className: 'flex items-center gap-3',
              children: [
                jsxRuntime.jsx(QuickConnectionBadge, {
                  presetName: activePresetName,
                  onClick: () => onPresetChange && setIsQuickConnectionOpen(!isQuickConnectionOpen),
                  refreshKey: connectionRefreshKey,
                }),
                jsxRuntime.jsxs('div', {
                  className: 'flex items-center gap-2 bg-slate-900/50 rounded-full px-2 py-0.5 border border-slate-700 relative',
                  children: [
                    jsxRuntime.jsx('button', {
                      onClick: () => setArenaMode(!isArenaMode),
                      className: `text-[10px] font-bold uppercase px-2 py-0.5 rounded  ${
                        isArenaMode ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
                      }`,
                      title: isArenaMode ? 'Tắt chế độ Đấu trường' : 'Bật chế độ Đấu trường (So sánh Model)',
                      children: 'VS',
                    }),
                    isArenaMode && jsxRuntime.jsxs(jsxRuntime.Fragment, {
                      children: [
                        jsxRuntime.jsxs('button', {
                          onClick: () => setIsArenaSettingsOpen(!isArenaSettingsOpen),
                          className: 'text-[10px] text-rose-300 font-bold hover:text-rose-100 flex items-center gap-1 max-w-[120px]',
                          title: 'Cấu hình Đấu trường',
                          children: [
                            jsxRuntime.jsx('span', {
                              className: 'truncate',
                              children: arenaModelId || 'Chọn Model',
                            }),
                            jsxRuntime.jsx('span', { className: 'text-xs font-bold', children: '⌄' }),
                          ],
                        }),
                        jsxRuntime.jsx(ArenaSettingsDialog, {
                          isOpen: isArenaSettingsOpen,
                          onClose: () => setIsArenaSettingsOpen(false),
                        }),
                      ],
                    }),
                  ],
                }),
                jsxRuntime.jsx('div', {
                  className: 'relative',
                  children: jsxRuntime.jsx(QuickConnectionDialog, {
                    isOpen: isQuickConnectionOpen,
                    onClose: () => setIsQuickConnectionOpen(false),
                    activePresetName,
                    onPresetChange,
                    activePersonaId,
                    onPersonaChange,
                    onConnectionChange: () => setConnectionRefreshKey(count => count + 1),
                  }),
                }),
              ],
            }),
          ],
        }),
        jsxRuntime.jsx(SpeechControls, {}),
        onSyncLorebook && jsxRuntime.jsx('button', {
          onClick: onSyncLorebook,
          disabled: isSyncingLorebook,
          className: `chat-icon-button p-2 rounded-full ${
            isSyncingLorebook ? 'bg-sky-600 text-white ' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
          }`,
          title: 'Đồng bộ Lorebook Ngữ nghĩa',
          'aria-label': 'Đồng bộ Lorebook Ngữ nghĩa',
          children: jsxRuntime.jsx(Icon, { name: 'sync', className: 'h-4 w-4' }),
        }),
        hasRpgData && onToggleRpgDashboard && jsxRuntime.jsx('button', {
          onClick: onToggleRpgDashboard,
          className: `chat-icon-button p-2 rounded-full ${
            isRpgDashboardOpen
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/50'
              : 'text-slate-400 hover:bg-slate-700 hover:text-white'
          }`,
          title: 'Bật/Tắt RPG Dashboard (Mythic Engine)',
          'aria-label': 'Bật hoặc tắt RPG Dashboard',
          children: jsxRuntime.jsx(Icon, { name: 'rpg', className: 'h-4 w-4' }),
        }),
        onToggleAssistant && jsxRuntime.jsx('button', {
          onClick: onToggleAssistant,
          className: `chat-icon-button p-2 rounded-full ${
            isAssistantOpen ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
          }`,
          title: 'Bật/Tắt Trợ lý Co-pilot',
          'aria-label': 'Bật hoặc tắt Trợ lý Co-pilot',
          children: jsxRuntime.jsx(Icon, { name: 'sparkles', className: 'h-4 w-4' }),
        }),
        jsxRuntime.jsxs('div', {
          className: 'relative',
          children: [
            jsxRuntime.jsx('button', {
              ref: settingsButtonRef,
              onClick: () => setIsSettingsOpen(!isSettingsOpen),
              className: `chat-icon-button p-2 rounded-full ${
                isSettingsOpen ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
              }`,
              title: 'Cài đặt Trò chuyện (Giao diện & Công cụ)',
              'aria-label': 'Cài đặt trò chuyện',
              children: jsxRuntime.jsx(Icon, { name: 'settings', className: 'h-4 w-4' }),
            }),
            jsxRuntime.jsx(ChatSettingsDialog, {
              isOpen: isSettingsOpen,
              onClose: () => {
                setIsSettingsOpen(false);
                settingsButtonRef.current?.focus();
              },
              visualState,
              onUpdate: onVisualUpdate,
              isHUDOpen,
              onToggleHUD,
              isStatusHUDOpen,
              onToggleStatusHUD,
            }),
          ],
        }),
      ],
    });
  };
}

export function createChatComposer(getDependencies) {
  return function ChatComposer({
    onSend,
    onStop,
    isLoading,
    isImmersive,
    quickReplies,
    onQuickReplyClick,
    scriptButtons = [],
    onScriptButtonClick,
    authorNote,
    onUpdateAuthorNote,
    isSummarizing,
    isInputLocked = false,
    children,
    isAutoLooping = false,
    onToggleAutoLoop,
    queueLength,
    isStoryMode = false,
    storyQueueLength = 0,
    onNextStoryChunk,
    onCancelStoryMode,
    error,
    onClearError,
    isSyncingLorebook = false,
    onFetchActionSuggestions,
    isFetchingSuggestions = false,
    suggestionSettingsEnabled = false,
    onRefineWriting,
    isRefiningWriting = false,
    writingRefinementEnabled = false,
  }) {
    const {
      truncateText,
      react,
      Icon,
      LoadingIndicator,
      slashCommandHints,
      jsxRuntime,
    } = resolveSessionDependencies(getDependencies);

    const [inputText, setInputText] = react.useState('');
    const [showCommandMenu, setShowCommandMenu] = react.useState(false);
    const [filteredCommands, setFilteredCommands] = react.useState(slashCommandHints);
    const [highlightedCommandIndex, setHighlightedCommandIndex] = react.useState(0);
    const [actionSuggestions, setActionSuggestions] = react.useState([]);
    const textareaRef = react.useRef(null);

    react.useEffect(() => {
      const handleSetInput = event => {
        if (event.detail) {
          setInputText(String(event.detail));
        }
      };
      window.addEventListener('sillytavern:set-input', handleSetInput);
      return () => window.removeEventListener('sillytavern:set-input', handleSetInput);
    }, []);

    react.useEffect(() => {
      const handleExternalSend = event => {
        const messageText = String(event.detail || '');
        if (messageText.trim() && !isLoading && !isInputLocked && !isSummarizing) {
          onSend(messageText);
        }
      };
      window.addEventListener('sillytavern:send-message', handleExternalSend);
      return () => window.removeEventListener('sillytavern:send-message', handleExternalSend);
    }, [isInputLocked, isLoading, isSummarizing, onSend]);

    react.useEffect(() => {
      if (inputText.startsWith('/')) {
        const prefix = inputText.toLowerCase();
        const matches = slashCommandHints.filter(item => item.cmd.startsWith(prefix));
        setFilteredCommands(matches);
        setShowCommandMenu(matches.length > 0 && inputText !== matches[0].cmd);
        setHighlightedCommandIndex(0);
      } else {
        setShowCommandMenu(false);
      }
    }, [inputText]);

    const applySlashCommand = (commandText, appendSpace) => {
      setInputText(appendSpace ? `${commandText} ` : commandText);
      setShowCommandMenu(false);
      textareaRef.current?.focus();
    };

    const handleSubmit = event => {
      event.preventDefault();
      if (isLoading) {
        if (isAutoLooping && onToggleAutoLoop) {
          onToggleAutoLoop();
        } else {
          onStop();
        }
        return;
      }
      if (isAutoLooping && onToggleAutoLoop) {
        onToggleAutoLoop();
      } else if (isStoryMode && onNextStoryChunk) {
        onNextStoryChunk();
      } else if (inputText.trim() && !isInputLocked && !isSummarizing) {
        onSend(inputText);
        setInputText('');
        setShowCommandMenu(false);
        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
        }
      }
    };

    const handleTextareaKeyDown = event => {
      if (showCommandMenu) {
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          setHighlightedCommandIndex(index => (index > 0 ? index - 1 : filteredCommands.length - 1));
        } else if (event.key === 'ArrowDown') {
          event.preventDefault();
          setHighlightedCommandIndex(index => (index < filteredCommands.length - 1 ? index + 1 : 0));
        } else if (event.key === 'Tab' || event.key === 'Enter') {
          event.preventDefault();
          const selected = filteredCommands[highlightedCommandIndex];
          if (selected) {
            applySlashCommand(selected.cmd);
          }
        } else if (event.key === 'Escape') {
          setShowCommandMenu(false);
        }
      } else if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSubmit(event);
      }
    };

    const handleFetchSuggestionsClick = async () => {
      if (!onFetchActionSuggestions) return;
      try {
        const fetched = await onFetchActionSuggestions(inputText.trim());
        setActionSuggestions(fetched);
      } catch (err) {
        console.error(err);
      }
    };

    const wrapperClass = isImmersive
      ? 'relative z-10 bg-slate-900/60  border-t border-white/10 w-full'
      : 'border-t border-slate-700 relative z-10 bg-slate-800/80 ';
    const innerPaddingClass = isImmersive ? 'p-4 md:p-6 w-full max-w-5xl mx-auto' : 'p-4 md:p-6';
    const summarizingMessage = queueLength && queueLength > 0
      ? `Đang tóm tắt... Còn ${queueLength} phần.`
      : 'Đang tóm tắt...';

    let inputPlaceholder = 'Nhập tin nhắn... (Gõ / để xem lệnh)';
    if (isInputLocked) {
      inputPlaceholder = 'Đang chờ kịch bản...';
    } else if (isSummarizing) {
      inputPlaceholder = 'Hệ thống đang tóm tắt...';
    } else if (isSyncingLorebook) {
      inputPlaceholder = 'Đang đồng bộ World Info...';
    } else if (isAutoLooping) {
      inputPlaceholder = 'Đang tự động chạy...';
    } else if (isImmersive) {
      inputPlaceholder = 'Nhập tin nhắn...';
    }

    return jsxRuntime.jsxs('div', {
      className: wrapperClass,
      children: [
        error && jsxRuntime.jsxs('div', {
          className: 'bg-red-900/90 text-white px-4 py-2 flex items-center justify-between  border-b border-red-700/50',
          children: [
            jsxRuntime.jsxs('div', {
              className: 'flex items-center gap-2',
              children: [
                jsxRuntime.jsx(Icon, { name: 'error', className: 'h-4 w-4' }),
                jsxRuntime.jsx('span', { className: 'text-sm font-medium', children: error }),
              ],
            }),
            onClearError && jsxRuntime.jsx('button', {
              onClick: onClearError,
              className: 'p-1 hover:bg-red-800 rounded-full  text-red-200 hover:text-white',
              title: 'Đóng thông báo',
              'aria-label': 'Đóng thông báo lỗi',
              children: jsxRuntime.jsx(Icon, { name: 'close', className: 'h-4 w-4' }),
            }),
          ],
        }),
        showCommandMenu && !isInputLocked && !isSummarizing && jsxRuntime.jsxs('div', {
          className: 'absolute bottom-full left-4 md:left-6 mb-2 w-72 bg-slate-900 border border-slate-600 rounded-lg shadow-2xl overflow-hidden z-50  flex flex-col',
          children: [
            jsxRuntime.jsx('div', {
              className: 'bg-slate-800 px-3 py-2 text-xs font-bold text-slate-400 border-b border-slate-700 uppercase tracking-wider',
              children: 'Gợi ý lệnh hệ thống',
            }),
            jsxRuntime.jsx('div', {
              className: 'max-h-60 overflow-y-auto custom-scrollbar',
              children: filteredCommands.map((item, index) => jsxRuntime.jsxs('button', {
                onClick: () => applySlashCommand(item.cmd),
                className: `w-full text-left px-4 py-2 text-sm flex flex-col  ${
                  index === highlightedCommandIndex ? 'bg-sky-600 text-white' : 'text-slate-200 hover:bg-slate-800'
                }`,
                children: [
                  jsxRuntime.jsx('span', { className: 'font-mono font-bold', children: item.cmd }),
                  jsxRuntime.jsx('span', {
                    className: `text-xs ${index === highlightedCommandIndex ? 'text-sky-200' : 'text-slate-500'}`,
                    children: item.desc,
                  }),
                ],
              }, item.cmd)),
            }),
          ],
        }),
        !isInputLocked && scriptButtons.length > 0 && onScriptButtonClick && jsxRuntime.jsx('div', {
          className: 'px-4 pt-2 pb-1 flex flex-wrap gap-2 justify-center md:justify-start  border-b border-white/5',
          children: scriptButtons.map(button => jsxRuntime.jsxs('button', {
            onClick: () => onScriptButtonClick(button),
            disabled: isSummarizing,
            className: 'px-3 py-1.5 text-xs font-bold rounded bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20   active:scale-95 border border-indigo-400/30 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed',
            children: [
              jsxRuntime.jsx(Icon, { name: 'tool', className: 'h-3.5 w-3.5 text-indigo-200' }),
              ' ',
              button.label,
            ],
          }, button.id)),
        }),
        !isInputLocked && quickReplies.length > 0 && jsxRuntime.jsx('div', {
          className: 'px-4 pt-2 flex flex-wrap gap-2 justify-end',
          children: quickReplies.map((reply, index) => jsxRuntime.jsx('button', {
            onClick: () => onQuickReplyClick(reply),
            disabled: isSummarizing,
            className: `px-3 py-1.5 text-sm rounded-full  border shadow-sm ${
              isImmersive
                ? 'bg-slate-700/80 border-slate-500 hover:bg-sky-600/90 text-white'
                : 'bg-slate-700 hover:bg-sky-600 text-slate-200 hover:text-white border-slate-600'
            } disabled:opacity-50 disabled:cursor-not-allowed`,
            children: reply.label,
          }, index)),
        }),
        authorNote && jsxRuntime.jsx('div', {
          className: 'px-4 pt-3 text-xs',
          children: jsxRuntime.jsxs('div', {
            className: `p-2 rounded-md flex justify-between items-center gap-2 ${
              isImmersive ? 'bg-slate-800/50  border border-slate-700' : 'bg-slate-900/70'
            }`,
            children: [
              jsxRuntime.jsxs('p', {
                className: 'text-slate-400 flex-grow truncate',
                children: [
                  jsxRuntime.jsx('span', { className: 'font-bold text-sky-400', children: 'Ghi chú: ' }),
                  jsxRuntime.jsx('span', { className: 'italic', children: truncateText(authorNote, 100) }),
                ],
              }),
              jsxRuntime.jsx('button', {
                onClick: () => onUpdateAuthorNote(''),
                className: 'text-slate-500 hover:text-white p-1 rounded-full flex-shrink-0',
                title: 'Xóa ghi chú',
                'aria-label': 'Xóa ghi chú của tác giả',
                children: jsxRuntime.jsx(Icon, { name: 'trash', className: 'h-4 w-4' }),
              }),
            ],
          }),
        }),
        actionSuggestions.length > 0 && jsxRuntime.jsxs('div', {
          className: 'px-4 pt-4 pb-2',
          children: [
            jsxRuntime.jsxs('div', {
              className: 'mb-2 flex justify-between items-center',
              children: [
                jsxRuntime.jsxs('span', {
                  className: 'text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1',
                  children: [
                    jsxRuntime.jsx('span', { className: 'text-sm', children: '💡' }),
                    ' Gợi ý Hành động',
                  ],
                }),
                jsxRuntime.jsx('button', {
                  onClick: () => setActionSuggestions([]),
                  className: 'text-slate-400 hover:text-white text-xs border border-slate-600 rounded px-2 py-1 bg-slate-800 hover:bg-slate-700',
                  children: 'Đóng',
                }),
              ],
            }),
            jsxRuntime.jsx('div', {
              className: 'flex overflow-x-auto gap-3 pb-2 custom-scrollbar snap-x',
              children: actionSuggestions.map((suggestion, index) => jsxRuntime.jsx('button', {
                onClick: () => {
                  onSend(suggestion);
                  setActionSuggestions([]);
                },
                className: `text-left text-sm p-3 rounded-lg flex-shrink-0 w-64 whitespace-normal border shadow-md snap-center ${
                  isImmersive
                    ? 'bg-slate-800/80 border-slate-600 hover:bg-slate-700 hover:border-slate-400 text-slate-200'
                    : 'bg-slate-700 border-slate-600 hover:bg-slate-600 hover:border-sky-500 text-slate-200'
                } transition-all active:scale-95`,
                children: jsxRuntime.jsx('span', { className: 'line-clamp-3', children: suggestion }),
              }, index)),
            }),
          ],
        }),
        jsxRuntime.jsxs('div', {
          className: innerPaddingClass,
          children: [
            jsxRuntime.jsx('div', {
              className: 'flex items-center justify-end mb-3 min-h-[20px]',
              children: isSummarizing && jsxRuntime.jsx(LoadingIndicator, { message: summarizingMessage }),
            }),
            jsxRuntime.jsxs('form', {
              id: 'send_form',
              onSubmit: handleSubmit,
              className: 'chat-composer flex gap-3',
              children: [
                jsxRuntime.jsx('div', {
                  className: 'relative flex-grow',
                  children: isStoryMode
                    ? jsxRuntime.jsxs('div', {
                        className: `w-full rounded-lg p-2 md:p-3 flex items-center justify-between transition border border-amber-500/30 gap-2 ${
                          isImmersive ? 'bg-slate-800/70 ' : 'bg-slate-700'
                        }`,
                        children: [
                          jsxRuntime.jsxs('div', {
                            className: 'flex items-center gap-3 overflow-hidden',
                            children: [
                              jsxRuntime.jsxs('span', {
                                className: 'text-amber-400 font-bold flex items-center gap-2 shrink-0',
                                children: [
                                  jsxRuntime.jsx('span', { className: 'text-xl', children: '📖' }),
                                  jsxRuntime.jsx('span', {
                                    className: 'hidden sm:inline',
                                    children: 'Chế độ Cốt truyện',
                                  }),
                                ],
                              }),
                              onCancelStoryMode && jsxRuntime.jsx('button', {
                                type: 'button',
                                onClick: onCancelStoryMode,
                                className: 'px-2 py-1 text-xs bg-red-900/50 hover:bg-red-900 text-red-200 rounded border border-red-700 hover:border-red-500  whitespace-nowrap',
                                children: 'Hủy (Dừng & Chat)',
                              }),
                            ],
                          }),
                          jsxRuntime.jsxs('span', {
                            className: 'text-slate-300 text-sm font-mono shrink-0',
                            children: [
                              jsxRuntime.jsx('span', { className: 'hidden sm:inline', children: 'Còn: ' }),
                              jsxRuntime.jsx('span', { className: 'text-white font-bold', children: storyQueueLength }),
                              jsxRuntime.jsx('span', { className: 'sm:hidden', children: ' left' }),
                            ],
                          }),
                        ],
                      })
                    : jsxRuntime.jsx('div', {
                        className: 'relative',
                        children: jsxRuntime.jsx('textarea', {
                          id: 'send_textarea',
                          ref: textareaRef,
                          rows: 1,
                          value: inputText,
                          onChange: event => setInputText(event.target.value),
                          onInput: event => {
                            event.currentTarget.style.height = 'auto';
                            event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 160)}px`;
                          },
                          onKeyDown: handleTextareaKeyDown,
                          placeholder: inputPlaceholder,
                          className: `chat-input w-full rounded-lg pl-3 pr-10 py-3 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition disabled:opacity-50 ${
                            isImmersive
                              ? 'bg-slate-800/70 border-slate-600/50 placeholder-slate-400'
                              : 'bg-slate-700 border border-slate-600'
                          } ${isInputLocked || isSummarizing || isSyncingLorebook ? 'cursor-not-allowed opacity-60' : ''}`,
                          disabled: isLoading || isInputLocked || isAutoLooping || isSummarizing || isSyncingLorebook,
                          'aria-label': 'Chat input',
                          autoComplete: 'off',
                        }),
                      }),
                }),
                jsxRuntime.jsx('button', {
                  id: 'send_but',
                  type: 'submit',
                  disabled: !isAutoLooping
                    && !isLoading
                    && (isInputLocked || (!inputText.trim() && !isStoryMode) || isSummarizing || isSyncingLorebook),
                  className: `chat-send-button text-white font-bold py-2 px-5 rounded-lg disabled:bg-slate-600 disabled:cursor-not-allowed flex-shrink-0 flex items-center justify-center gap-2 min-w-[80px] ${
                    isImmersive
                      ? 'bg-sky-600/80 hover:bg-sky-600 '
                      : (isAutoLooping || isLoading ? 'bg-red-600 hover:bg-red-700' : 'bg-sky-600 hover:bg-sky-700')
                  }`,
                  'aria-label': isAutoLooping || isLoading ? 'Dừng lại' : 'Gửi tin nhắn',
                  children: isAutoLooping || isLoading
                    ? jsxRuntime.jsxs(jsxRuntime.Fragment, {
                        children: [
                          jsxRuntime.jsx(Icon, { name: 'stop', className: 'h-4 w-4' }),
                          jsxRuntime.jsx('span', { children: 'Dừng' }),
                        ],
                      })
                    : isStoryMode
                      ? jsxRuntime.jsxs(jsxRuntime.Fragment, {
                          children: [
                            jsxRuntime.jsx(Icon, { name: 'send', className: 'h-4 w-4' }),
                            jsxRuntime.jsx('span', { children: 'Tiếp tục' }),
                          ],
                        })
                      : jsxRuntime.jsxs(jsxRuntime.Fragment, {
                          children: [
                            jsxRuntime.jsx(Icon, { name: 'send', className: 'h-4 w-4' }),
                            jsxRuntime.jsx('span', { children: 'Gửi' }),
                          ],
                        }),
                }),
                suggestionSettingsEnabled && !isStoryMode && !isAutoLooping && !isLoading && jsxRuntime.jsx('button', {
                  type: 'button',
                  onClick: handleFetchSuggestionsClick,
                  disabled: isFetchingSuggestions || isInputLocked || isSummarizing || isSyncingLorebook || isRefiningWriting,
                  className: `py-2 px-3 rounded-lg border flex-shrink-0 flex items-center justify-center transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                    isImmersive
                      ? 'bg-amber-600/80 hover:bg-amber-500 border-amber-500 text-white'
                      : 'bg-amber-600 hover:bg-amber-500 border-amber-500 text-white'
                  }`,
                  title: 'Gợi ý hành động từ AI',
                  'aria-label': 'Gợi ý hành động từ AI',
                  children: isFetchingSuggestions
                    ? jsxRuntime.jsx('span', { className: 'animate-spin text-lg', children: '⏳' })
                    : jsxRuntime.jsx('span', { className: 'text-lg', 'aria-hidden': 'true', children: '💡' }),
                }),
                writingRefinementEnabled && !isStoryMode && !isAutoLooping && !isLoading && jsxRuntime.jsx('button', {
                  type: 'button',
                  onClick: onRefineWriting,
                  disabled: isRefiningWriting || isInputLocked || isSummarizing || isSyncingLorebook || isFetchingSuggestions,
                  className: `py-2 px-3 rounded-lg border flex-shrink-0 flex items-center justify-center transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
                    isImmersive
                      ? 'bg-teal-600/80 hover:bg-teal-500 border-teal-500 text-white'
                      : 'bg-teal-600 hover:bg-teal-500 border-teal-500 text-white'
                  }`,
                  title: 'Cải thiện văn chương (Tin nhắn AI cuối cùng)',
                  'aria-label': 'Cải thiện văn chương',
                  children: isRefiningWriting
                    ? jsxRuntime.jsx('span', { className: 'animate-spin text-lg', children: '⏳' })
                    : jsxRuntime.jsx('span', { className: 'text-lg', 'aria-hidden': 'true', children: '✨' }),
                }),
                onToggleAutoLoop && !isInputLocked && !isSummarizing && jsxRuntime.jsx('button', {
                  type: 'button',
                  onClick: onToggleAutoLoop,
                  className: `py-2 px-3 rounded-lg   border flex items-center justify-center ${
                    isAutoLooping
                      ? 'bg-sky-500/20 border-sky-500 text-sky-400 shadow-[0_0_10px_rgba(14,165,233,0.3)]'
                      : 'bg-slate-700 border-slate-600 text-slate-400 hover:bg-slate-600 hover:text-white'
                  }`,
                  title: 'Tự động chạy (Auto-Play)',
                  'aria-label': isAutoLooping ? 'Tắt tự động chạy' : 'Bật tự động chạy',
                  'aria-pressed': isAutoLooping,
                  children: jsxRuntime.jsx('span', {
                    className: 'text-xl leading-none ',
                    'aria-hidden': 'true',
                    children: '♾️',
                  }),
                }),
              ],
            }),
            children,
          ],
        }),
      ],
    });
  };
}

export function createChatDialogs(getDependencies) {
  return function ChatDialogs({
    isAuthorNoteOpen,
    setIsAuthorNoteOpen,
    authorNote,
    updateAuthorNote,
    isWorldInfoOpen,
    setIsWorldInfoOpen,
    worldInfoEntries,
    worldInfoState,
    worldInfoPinned,
    worldInfoPlacement,
    updateWorldInfoState,
    updateWorldInfoPinned,
    updateWorldInfoPlacement,
    isLorebookCreatorOpen,
    setIsLorebookCreatorOpen,
    lorebookKeyword,
    setLorebookKeyword,
    lorebooks,
    characterId,
  }) {
    const {
      isProxyForToolsEnabled,
      AuthorNoteDialog,
      WorldInfoDialog,
      callProxyToolModel,
      useDialogFocus,
      aiStudioToolText,
      defaultGeminiSafetySettings,
      react,
      callGeminiToolModel,
      LorebookGeneratorModal,
      getConnectionSettings,
      jsxRuntime,
    } = resolveSessionDependencies(getDependencies);

    const [isResultModalOpen, setIsResultModalOpen] = react.useState(false);
    const [generationPromise, setGenerationPromise] = react.useState(Promise.resolve(''));
    const [submittedKeyword, setSubmittedKeyword] = react.useState('');
    const [isKeywordPromptOpen, setIsKeywordPromptOpen] = react.useState(false);
    const keywordDialogRef = react.useRef(null);
    const keywordInputRef = react.useRef(null);

    useDialogFocus(isKeywordPromptOpen, () => setIsLorebookCreatorOpen(false), keywordDialogRef, keywordInputRef);

    react.useEffect(() => {
      if (isLorebookCreatorOpen && !isResultModalOpen && !isKeywordPromptOpen) {
        setIsKeywordPromptOpen(true);
      }
    }, [isLorebookCreatorOpen]);

    react.useEffect(() => {
      if (!isLorebookCreatorOpen) {
        setIsKeywordPromptOpen(false);
        setIsResultModalOpen(false);
      }
    }, [isLorebookCreatorOpen]);

    const generateLorebookEntry = async keyword => {
      const prompt = `Dựa trên lịch sử hội thoại, hãy viết một mục từ điển (Lorebook) chi tiết cho từ khóa "${keyword}".\n\nNhân vật: ${lorebooks.length > 0 ? lorebooks[0].name : 'Character'}`;
      const settings = getConnectionSettings();
      let generatedText = '';

      if (settings.source === 'aistudio') {
        generatedText = await aiStudioToolText(
          prompt,
          settings.aistudio_tool_model || settings.aistudio_model || 'gemini-2.5-flash',
        );
      } else if (isProxyForToolsEnabled()) {
        generatedText = await callProxyToolModel(
          prompt,
          settings.proxy_model || settings.proxy_tool_model || 'gemini-3.1-pro-preview',
          settings.proxy_protocol,
        );
      } else {
        const response = await callGeminiToolModel(
          'gemini-3.1-pro-preview',
          prompt,
          { temp: 0.7 },
          defaultGeminiSafetySettings,
        );
        generatedText = response.text || '';
      }
      return generatedText.trim();
    };

    const handleCreateLorebookEntry = () => {
      const trimmedKeyword = lorebookKeyword.trim();
      if (!trimmedKeyword) {
        alert('Vui lòng nhập từ khóa.');
        return;
      }
      const pendingPromise = generateLorebookEntry(trimmedKeyword);
      setSubmittedKeyword(trimmedKeyword);
      setGenerationPromise(pendingPromise);
      setIsResultModalOpen(true);
      setIsKeywordPromptOpen(false);
      setLorebookKeyword('');
    };

    return jsxRuntime.jsxs(jsxRuntime.Fragment, {
      children: [
        jsxRuntime.jsx(AuthorNoteDialog, {
          isOpen: isAuthorNoteOpen,
          initialNote: authorNote,
          onSave: nextNote => {
            updateAuthorNote(nextNote);
            setIsAuthorNoteOpen(false);
          },
          onClose: () => setIsAuthorNoteOpen(false),
        }),
        jsxRuntime.jsx(WorldInfoDialog, {
          isOpen: isWorldInfoOpen,
          onClose: () => setIsWorldInfoOpen(false),
          entries: worldInfoEntries,
          worldInfoState,
          worldInfoPinned,
          worldInfoPlacement,
          onUpdate: updateWorldInfoState,
          onUpdatePinned: updateWorldInfoPinned,
          onUpdatePlacement: updateWorldInfoPlacement,
          characterId,
        }),
        isKeywordPromptOpen && jsxRuntime.jsx('div', {
          className: 'fixed inset-0 bg-black/60  flex items-center justify-center z-[100] p-4',
          onClick: () => setIsLorebookCreatorOpen(false),
          role: 'dialog',
          'aria-modal': 'true',
          'aria-labelledby': 'ai-lorebook-title',
          children: jsxRuntime.jsxs('div', {
            ref: keywordDialogRef,
            className: 'bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md p-6',
            onClick: event => event.stopPropagation(),
            children: [
              jsxRuntime.jsx('h3', {
                id: 'ai-lorebook-title',
                className: 'text-lg font-bold text-sky-400 mb-4',
                children: 'Tạo Mục Sổ tay AI',
              }),
              jsxRuntime.jsxs('div', {
                className: 'space-y-4',
                children: [
                  jsxRuntime.jsx('input', {
                    ref: keywordInputRef,
                    type: 'text',
                    value: lorebookKeyword,
                    onChange: event => setLorebookKeyword(event.target.value),
                    placeholder: 'Nhập từ khóa hoặc tên mục...',
                    'aria-label': 'Nhập từ khóa',
                    className: 'w-full bg-slate-900 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-1 focus:ring-sky-500',
                    autoFocus: true,
                  }),
                  jsxRuntime.jsxs('div', {
                    className: 'flex gap-2 justify-end',
                    children: [
                      jsxRuntime.jsx('button', {
                        onClick: () => setIsLorebookCreatorOpen(false),
                        className: 'text-sm bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-4 rounded-md ',
                        children: 'Hủy',
                      }),
                      jsxRuntime.jsx('button', {
                        onClick: handleCreateLorebookEntry,
                        className: 'text-sm bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-4 rounded-md ',
                        children: 'Tạo',
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        }),
        jsxRuntime.jsx(LorebookGeneratorModal, {
          isOpen: isResultModalOpen,
          onClose: () => {
            setIsResultModalOpen(false);
            setIsLorebookCreatorOpen(false);
          },
          keyword: submittedKeyword,
          contentPromise: generationPromise,
        }),
      ],
    });
  };
}

export function createChatSessionScreen(getDependencies) {
  return function ChatSessionScreen({ sessionId, onBack }) {
    const {
      parseLooseJson,
      isProxyForToolsEnabled,
      mutateVariable,
      RpgNotificationBanner,
      callProxyToolModel,
      DiagnosticsFooter,
      defaultRefinementPrompt,
      syncLorebookEmbeddings,
      ChatHud,
      WritingRefinementDialog,
      defaultActionSuggestionPrompt,
      aiStudioToolText,
      defaultGeminiSafetySettings,
      MessageList,
      getSmartScanSettings,
      react,
      extractStoryContent,
      ChatVisualBackdrop,
      callGeminiToolModel,
      countConversationTurns,
      useToast,
      characterStore,
      ChatWorkspaceFrame,
      useChatSession,
      getLiterarySettings,
      LoadingIndicator,
      ChatHeader,
      getConnectionSettings,
      getSummarySettings,
      ChatComposer,
      lorebookStore,
      getActionSuggestionSettings,
      jsxRuntime,
      getGeminiApiKey,
    } = resolveSessionDependencies(getDependencies);

    const session = useChatSession(sessionId);

    const [isImmersive, setIsImmersive] = react.useState(false);
    const [isAssistantOpen, setIsAssistantOpen] = react.useState(false);
    const [isHUDOpen, setIsHUDOpen] = react.useState(false);
    const [isStatusHUDOpen, setIsStatusHUDOpen] = react.useState(false);
    const [isRpgDashboardOpen, setIsRpgDashboardOpen] = react.useState(false);
    const [isAuthorNoteOpen, setIsAuthorNoteOpen] = react.useState(false);
    const [isWorldInfoOpen, setIsWorldInfoOpen] = react.useState(false);
    const [isLorebookCreatorOpen, setIsLorebookCreatorOpen] = react.useState(false);
    const [lorebookKeyword, setLorebookKeyword] = react.useState('');
    const [editingMessageId, setEditingMessageId] = react.useState(null);
    const [editingContent, setEditingContent] = react.useState('');

    const toggleHUD = react.useCallback(() => setIsHUDOpen(open => !open), []);
    const toggleStatusHUD = react.useCallback(() => setIsStatusHUDOpen(open => !open), []);
    const toggleAssistant = react.useCallback(() => setIsAssistantOpen(open => !open), []);
    const toggleRpgDashboard = react.useCallback(() => setIsRpgDashboardOpen(open => !open), []);
    const startEditing = react.useCallback(message => {
      setEditingMessageId(message.id);
      setEditingContent(message.content);
    }, []);
    const cancelEditing = react.useCallback(() => {
      setEditingMessageId(null);
      setEditingContent('');
    }, []);

    const uiState = {
      isImmersive,
      setIsImmersive,
      isAssistantOpen,
      setIsAssistantOpen,
      toggleAssistant,
      isHUDOpen,
      setIsHUDOpen,
      toggleHUD,
      isStatusHUDOpen,
      setIsStatusHUDOpen,
      toggleStatusHUD,
      isRpgDashboardOpen,
      setIsRpgDashboardOpen,
      toggleRpgDashboard,
      isAuthorNoteOpen,
      setIsAuthorNoteOpen,
      isWorldInfoOpen,
      setIsWorldInfoOpen,
      isLorebookCreatorOpen,
      setIsLorebookCreatorOpen,
      lorebookKeyword,
      setLorebookKeyword,
      editingMessageId,
      editingContent,
      setEditingContent,
      startEditing,
      cancelEditing,
    };

    const { characters } = characterStore();
    const { lorebooks } = lorebookStore();
    const iframeRefs = react.useRef({});
    const [isSyncingLorebook, setIsSyncingLorebook] = react.useState(false);
    const [isFetchingSuggestions, setIsFetchingSuggestions] = react.useState(false);
    const [isRefiningWriting, setIsRefiningWriting] = react.useState(false);
    const [refinementDialogState, setRefinementDialogState] = react.useState({
      isOpen: false,
      originalFullContent: '',
      originalTextToRefine: '',
      refinedText: '',
      messageId: '',
    });
    const { showToast } = useToast();

    react.useEffect(() => {
      const scanSettings = getSmartScanSettings();
      const semanticActive = scanSettings.enabled
        && ['semantic', 'hybrid_fast', 'ultimate'].includes(scanSettings.mode);
      const apiKey = getGeminiApiKey();
      if (semanticActive && apiKey && session.card?.char_book?.entries) {
        const enabledEntries = session.card.char_book.entries.filter(entry => entry.enabled !== false);
        syncLorebookEmbeddings(session.card.fileName || session.card.name, enabledEntries).catch(error => {
          console.error('Background character lorebook sync failed:', error);
          showToast(`Không thể đồng bộ Lorebook: ${error.message || error}`, 'error');
        });
      }
    }, [session.card?.fileName, session.card?.name, session.card?.char_book?.entries]);

    react.useEffect(() => () => {
      session.resetStore();
    }, [session.resetStore]);

    const characterAvatarUrl = react.useMemo(
      () => (session.card && characters.find(item => item.fileName === session.card.fileName)?.avatarUrl) || null,
      [session.card, characters],
    );

    const lastInteractiveMessage = react.useMemo(
      () => [...session.messages].reverse().find(message => message.interactiveHtml),
      [session.messages],
    );

    const summarySettings = getSummarySettings();
    const contextDepth = summarySettings.context_depth || 24;
    const resolvedChunkSize = summaryChunkSize(summarySettings, session);
    const unsummarizedTurnCount = react.useMemo(() => {
      const totalTurns = countConversationTurns(session.messages);
      const summarizedTurns = session.longTermSummaries.length * resolvedChunkSize;
      return Math.max(0, totalTurns - summarizedTurns);
    }, [session.messages, session.longTermSummaries.length, resolvedChunkSize]);

    const isInitialLoading = session.isLoading && (!session.card || !session.preset);

    const runWritingRefinement = async textToRefine => {
      setIsRefiningWriting(true);
      try {
        const literarySettings = getLiterarySettings();
        const prompt = (literarySettings.writing_refinement_prompt || defaultRefinementPrompt)
          .replace('{{content}}', textToRefine);
        const connSettings = getConnectionSettings();
        let refinedOutput = '';

        if (connSettings.source === 'aistudio') {
          refinedOutput = await aiStudioToolText(
            prompt,
            connSettings.aistudio_tool_model || connSettings.aistudio_model || 'gemini-2.5-flash',
          );
        } else if (isProxyForToolsEnabled() || connSettings.source === 'proxy') {
          refinedOutput = await callProxyToolModel(
            prompt,
            connSettings.proxy_tool_model || connSettings.proxy_model || 'gemini-3-flash-preview',
            connSettings.proxy_protocol,
          );
        } else {
          const response = await callGeminiToolModel(
            literarySettings.gemini_model || 'gemini-3-flash-preview',
            prompt,
            { temp: 0.7 },
            defaultGeminiSafetySettings,
          );
          refinedOutput = response.text || '';
        }

        setRefinementDialogState(previous => ({
          ...previous,
          refinedText: refinedOutput.trim() || '',
        }));
      } catch (error) {
        showToast(`Lỗi khi cải thiện: ${error.message}`, 'error');
      } finally {
        setIsRefiningWriting(false);
      }
    };

    const closeRefinementDialog = () => {
      setRefinementDialogState(previous => ({ ...previous, isOpen: false }));
    };

    const handleSyncLorebook = async () => {
      if (!session.card || !session.card.char_book) {
        showToast('Không tìm thấy Lorebook để đồng bộ.', 'error');
        return;
      }
      const scanSettings = getSmartScanSettings();
      if (!scanSettings.enabled || !['semantic', 'hybrid_fast', 'ultimate'].includes(scanSettings.mode)) {
        showToast('Smart Scan hoặc Semantic Search đang tắt.', 'info');
        return;
      }
      setIsSyncingLorebook(true);
      try {
        const enabledEntries = session.card.char_book.entries.filter(entry => entry.enabled !== false);
        await syncLorebookEmbeddings(session.card.fileName || session.card.name, enabledEntries);
        showToast('Đồng bộ Lorebook Ngữ nghĩa thành công!', 'success');
      } catch (error) {
        console.error('Failed to sync lorebook embeddings:', error);
        if (error.message?.includes('API Key')) {
          showToast('Vui lòng cấu hình Gemini API Key trong phần Cài đặt.', 'error');
        } else {
          showToast(`Gặp lỗi khi đồng bộ Lorebook: ${error.message || 'Lỗi không xác định'}`, 'error');
        }
      } finally {
        setIsSyncingLorebook(false);
      }
    };

    const handleFetchActionSuggestions = async userDraftInput => {
      setIsFetchingSuggestions(true);
      try {
        const recentHistory = session.messages
          .slice(-15)
          .map(message => `${message.role}: ${extractStoryContent(message.content)}`)
          .join('\n\n');
        const summaryText = session.longTermSummaries.join('\n\n');
        let activeLoreText = '';
        const latestModelMsg = session.messages.slice().reverse().find(message => message.role === 'model');
        if (latestModelMsg?.activeLorebookUids?.length > 0) {
          activeLoreText = lorebooks
            .flatMap(book => book.book.entries.filter(entry => latestModelMsg.activeLorebookUids.includes(entry.uid)))
            .map(entry => `[${entry.keys.join(', ')}: ${entry.content}]`)
            .join('\n');
        }

        const suggestionSettings = getActionSuggestionSettings();
        const prompt = (suggestionSettings.action_suggestion_prompt || defaultActionSuggestionPrompt)
          .replace('{{long_term_summary}}', summaryText || '(Không có)')
          .replace('{{current_page_history}}', recentHistory)
          .replace('{{worldInfo}}', activeLoreText || '(Không có)')
          .replace('{{user_input}}', userDraftInput || '(Không có)');

        const connSettings = getConnectionSettings();
        let rawResponse = '';
        if (connSettings.source === 'aistudio') {
          rawResponse = await aiStudioToolText(
            prompt,
            connSettings.aistudio_tool_model || connSettings.aistudio_model || 'gemini-2.5-flash',
          );
        } else if (connSettings.source === 'proxy') {
          rawResponse = await callProxyToolModel(
            prompt,
            connSettings.proxy_tool_model || connSettings.proxy_model || 'gemini-3-flash-preview',
            connSettings.proxy_protocol,
          );
        } else {
          const response = await callGeminiToolModel(
            suggestionSettings.gemini_model || 'gemini-3-flash-preview',
            prompt,
            { temp: 0.8 },
            defaultGeminiSafetySettings,
          );
          rawResponse = response.text || '{"suggestions":[]}';
        }

        const unwrapped = rawResponse.replace(/```(?:json)?\s*([\s\S]*?)\s*```/gi, '$1').trim();
        try {
          const parsed = parseLooseJson(unwrapped);
          if (parsed && Array.isArray(parsed.suggestions)) {
            return parsed.suggestions
              .map(item => {
                const choiceMatch = item.match(/\[CHOICE:\s*"?([^"\]]+)"?\]/);
                return choiceMatch
                  ? choiceMatch[1].trim()
                  : item.replace(/\[CHOICE:\s*"?/, '').replace(/"?\]$/, '').trim();
              })
              .filter(Boolean);
          }
        } catch (error) {
          console.warn('Failed to parse action suggestions JSON:', error, unwrapped);
        }
        return [];
      } catch (error) {
        console.error('Action suggestions failed:', error);
        showToast('Lỗi khi lấy gợi ý hành động. Vui lòng thử lại.', 'error');
        return [];
      } finally {
        setIsFetchingSuggestions(false);
      }
    };

    const handleOpenWritingRefinement = async () => {
      const latestMessage = session.messages.length > 0 ? session.messages[session.messages.length - 1] : null;
      if (!latestMessage || latestMessage.role !== 'model') {
        showToast('Chỉ có thể cải thiện tin nhắn cuối cùng của AI.', 'info');
        return;
      }
      const contentMatch = latestMessage.content.match(/<content>([\s\S]*?)<\/content>/i);
      if (!contentMatch) {
        showToast('Không tìm thấy thẻ <content> trong phản hồi của AI.', 'info');
        return;
      }
      const innerContent = contentMatch[1].trim();
      setRefinementDialogState({
        isOpen: true,
        originalFullContent: latestMessage.content,
        originalTextToRefine: innerContent,
        refinedText: '',
        messageId: latestMessage.id,
      });
      runWritingRefinement(innerContent);
    };

    if (isInitialLoading) {
      return jsxRuntime.jsx('div', {
        className: 'flex justify-center items-center h-full',
        children: jsxRuntime.jsx(LoadingIndicator, { message: 'Đang tải phiên trò chuyện...' }),
      });
    }

    if (!session.card || !session.preset) {
      return jsxRuntime.jsx('div', {
        className: 'flex flex-col justify-center items-center h-full gap-4 text-amber-400 bg-slate-900',
        children: jsxRuntime.jsxs('div', {
          className: 'p-6 bg-slate-800 rounded-xl shadow-lg border border-slate-700 max-w-md text-center',
          children: [
            jsxRuntime.jsx('div', { className: 'text-4xl mb-4', children: '🚫' }),
            jsxRuntime.jsx('p', {
              className: 'font-bold text-xl text-white mb-2',
              children: 'Dữ liệu không khả dụng',
            }),
            jsxRuntime.jsxs('p', {
              className: 'text-slate-400 mb-6 text-sm',
              children: [
                'Hệ thống không tìm thấy ',
                jsxRuntime.jsxs('strong', {
                  children: [
                    session.card ? '' : 'Thẻ nhân vật',
                    ' ',
                    session.card || session.preset ? '' : 'và',
                    ' ',
                    session.preset ? '' : 'Preset',
                  ],
                }),
                ' tương ứng.',
                jsxRuntime.jsx('br', {}),
                jsxRuntime.jsx('span', {
                  className: 'text-xs opacity-75 mt-2 block',
                  children: '(Lỗi này thường xảy ra nếu bạn đã xóa file gốc sau khi tạo cuộc trò chuyện).',
                }),
              ],
            }),
            jsxRuntime.jsx('button', {
              onClick: onBack,
              className: 'w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 px-4 rounded-lg ',
              children: 'Quay lại Sảnh',
            }),
          ],
        }),
      });
    }

    return jsxRuntime.jsxs(ChatWorkspaceFrame, {
      isImmersive,
      globalClass: session.visualState.globalClass,
      children: [
        jsxRuntime.jsx(ChatVisualBackdrop, {
          visualState: session.visualState,
          isImmersive,
        }),
        jsxRuntime.jsx(RpgNotificationBanner, {}),
        jsxRuntime.jsx(ChatHeader, {
          characterName: session.card.name,
          onBack: () => {
            session.saveSession({});
            onBack();
          },
          isImmersive,
          setIsImmersive,
          visualState: session.visualState,
          onVisualUpdate: session.updateVisualState,
          onToggleHUD: toggleHUD,
          isHUDOpen,
          onToggleStatusHUD: toggleStatusHUD,
          isStatusHUDOpen,
          activePresetName: session.preset.name,
          onPresetChange: session.changePreset,
          activePersonaId: session.persona?.id,
          onPersonaChange: session.changePersona,
          onToggleAssistant: toggleAssistant,
          isAssistantOpen,
          hasRpgData: Boolean(session.card.rpg_data),
          onToggleRpgDashboard: toggleRpgDashboard,
          isRpgDashboardOpen,
          onSyncLorebook: handleSyncLorebook,
          isSyncingLorebook,
        }),
        jsxRuntime.jsx(MessageList, {
          messages: session.messages,
          isLoading: session.isLoading,
          isSummarizing: session.isSummarizing,
          isImmersive,
          characterName: session.card.name,
          characterAvatarUrl,
          userAvatarUrl: session.persona?.avatar,
          embeddedAssets: session.card.__embedded_assets || {},
          userPersonaName: session.persona?.name || 'User',
          characterId: session.card.fileName || session.card.name,
          sessionId,
          editingMessageId,
          editingContent,
          setEditingContent,
          onStartEdit: startEditing,
          onCancelEdit: cancelEditing,
          onSaveEdit: async () => {
            if (editingMessageId) {
              const saved = await session.editMessage(editingMessageId, editingContent);
              if (saved !== false) {
                cancelEditing();
              }
            }
          },
          regenerateLastResponse: session.regenerateLastResponse,
          deleteLastTurn: session.deleteLastTurn,
          onDeleteMessage: session.deleteMessage,
          onDeleteSingleMessage: session.deleteOneMessage,
          onOpenAuthorNote: () => setIsAuthorNoteOpen(true),
          onOpenWorldInfo: () => setIsWorldInfoOpen(true),
          onArenaSelect: session.handleArenaSelection,
          onArenaRetry: session.handleArenaRetry,
          disableInteractiveMode: session.visualState.disableInteractiveMode,
          scripts: session.card.extensions?.TavernHelper_scripts || [],
          variables: session.variables,
          extensionSettings: session.extensionSettings,
          characterCard: session.card,
          preset: session.preset,
          persona: session.persona,
          iframeRefs,
          onIframeLoad: () => {},
        }),
        jsxRuntime.jsx(ChatComposer, {
          onSend: text => (text.trim().startsWith('/') ? session.executeSlashCommands(text) : session.sendMessage(text)),
          onStop: session.stopGeneration,
          isLoading: session.isLoading,
          isImmersive,
          quickReplies: session.quickReplies,
          onQuickReplyClick: reply => (
            reply.action ? session.executeSlashCommands(reply.action) : session.sendMessage(reply.message || reply.label)
          ),
          scriptButtons: session.scriptButtons,
          onScriptButtonClick: session.handleScriptButtonClick,
          authorNote: session.authorNote,
          onUpdateAuthorNote: session.updateAuthorNote,
          isSummarizing: session.isSummarizing,
          isInputLocked: session.isInputLocked,
          isAutoLooping: session.isAutoLooping,
          onToggleAutoLoop: () => session.setIsAutoLooping(!session.isAutoLooping),
          queueLength: session.queueLength,
          isStoryMode: session.isStoryMode,
          storyQueueLength: session.storyQueue ? session.storyQueue.length : 0,
          onNextStoryChunk: session.advanceStoryChunk,
          onCancelStoryMode: session.cancelStoryMode,
          error: session.error,
          onClearError: () => session.setError(null),
          isSyncingLorebook,
          onFetchActionSuggestions: handleFetchActionSuggestions,
          isFetchingSuggestions,
          suggestionSettingsEnabled: getActionSuggestionSettings().enabled,
          onRefineWriting: handleOpenWritingRefinement,
          isRefiningWriting,
          writingRefinementEnabled: getLiterarySettings().enabled,
          children: jsxRuntime.jsx(DiagnosticsFooter, {
            logs: session.logs,
            messages: session.messages,
            onClearLogs: session.clearLogs,
            onInspectState: () => setIsHUDOpen(true),
            isImmersive,
            onLorebookCreatorOpen: () => setIsLorebookCreatorOpen(true),
            summaryStats: {
              messageCount: unsummarizedTurnCount,
              summaryCount: session.longTermSummaries.length,
              contextDepth,
              chunkSize: resolvedChunkSize,
              queueLength: session.queueLength,
            },
            longTermSummaries: session.longTermSummaries,
            summaryQueue: session.summaryQueue,
            onForceSummarize: session.triggerSmartContext,
            onRegenerateSummary: session.handleRegenerateSummary,
            onRetryFailedTask: session.handleRetryFailedTask,
            onRetryMythic: session.handleRetryMythic,
          }),
        }),
        jsxRuntime.jsx(ChatHud, {
          ref: hudElement => {
            if (hudElement) {
              iframeRefs.current.hud = hudElement;
            }
          },
          uiState,
          data: {
            card: session.card,
            messages: session.messages,
            longTermSummaries: session.longTermSummaries,
            lorebooks,
            authorNote: session.authorNote,
            worldInfoState: session.worldInfoState,
            worldInfoPinned: session.worldInfoPinned,
            worldInfoPlacement: session.worldInfoPlacement,
            variables: session.variables,
            logs: session.logs,
            lastInteractiveMsg: lastInteractiveMessage,
            characterAvatarUrl,
            userPersonaAvatarUrl: session.persona?.avatar || null,
            userPersonaName: session.persona?.name || 'User',
            sessionId,
            extensionSettings: session.extensionSettings,
            interactiveError: session.interactiveError,
            generatedLorebookEntries: session.generatedLorebookEntries,
          },
          actions: {
            updateAuthorNote: session.updateAuthorNote,
            updateWorldInfoState: session.updateWorldInfoState,
            updateWorldInfoPinned: session.updateWorldInfoPinned,
            updateWorldInfoPlacement: session.updateWorldInfoPlacement,
            handleUpdateVariable: (key, value) => {
              try {
                const updatedVariables = mutateVariable(session.variables, 'set', key, value);
                session.setVariables(updatedVariables);
                session.saveSession({ variables: updatedVariables });
              } catch (error) {
                console.error('Failed to update variable via Assistant:', error);
              }
            },
            handleRewriteLastTurn: session.editMessage,
            handleUserDecision: session.handleUserDecision,
          },
        }),
        jsxRuntime.jsx(WritingRefinementDialog, {
          isOpen: refinementDialogState.isOpen,
          originalText: refinementDialogState.originalTextToRefine,
          refinedText: refinementDialogState.refinedText,
          isLoading: isRefiningWriting,
          onConfirm: async () => {
            const { messageId, originalFullContent, refinedText } = refinementDialogState;
            if (!refinedText) return;
            const nextFullContent = originalFullContent.replace(
              /<content>[\s\S]*?<\/content>/i,
              `<content>\n${refinedText}\n</content>`,
            );
            await session.editMessage(messageId, nextFullContent);
            showToast('Đã áp dụng văn chương cải thiện!', 'success');
            setRefinementDialogState(previous => ({ ...previous, isOpen: false }));
          },
          onCancel: closeRefinementDialog,
          onRetry: () => {
            setRefinementDialogState(previous => ({ ...previous, refinedText: '' }));
            runWritingRefinement(refinementDialogState.originalTextToRefine);
          },
          onClose: closeRefinementDialog,
        }),
      ],
    });
  };
}