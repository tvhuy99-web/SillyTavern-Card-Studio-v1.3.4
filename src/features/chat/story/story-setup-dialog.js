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
    } = getDependencies();

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
