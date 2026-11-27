export function createRelevanceTestDialog(getDependencies) {
  return function RelevanceTestDialog({ characterId, entries, onClose }) {
    const {
      embedQuery,
      getEmbeddingIndex,
      cosineSimilarity,
      loadEmbeddingIndex,
      useDialogFocus,
      embeddingService,
      getSmartScanSettings,
      react,
      jsxRuntime,
    } = getDependencies();

    const [queryText, setQueryText] = react.useState('');
    const [scoredResults, setScoredResults] = react.useState([]);
    const [isTesting, setIsTesting] = react.useState(false);
    const [errorMessage, setErrorMessage] = react.useState(null);
    const dialogRef = react.useRef(null);
    const closeButtonRef = react.useRef(null);

    const handleRunRelevanceTest = async () => {
      if (!queryText.trim()) return;
      setIsTesting(true);
      setErrorMessage(null);
      try {
        const providerId = getSmartScanSettings().embedding_provider || 'gemini';
        const queryVector = await embedQuery(queryText, providerId);
        await loadEmbeddingIndex(characterId, providerId);
        const indexRecords = getEmbeddingIndex(characterId, providerId);
        const entriesByUid = new Map(entries.map(entry => [entry.uid, entry]));

        const scoredChunks = indexRecords
          .map(record => ({
            entry: entriesByUid.get(record.uid),
            uid: record.uid,
            score: cosineSimilarity(queryVector, record.vector),
          }))
          .filter(item => item.entry !== undefined);

        const bestByUid = new Map();
        scoredChunks.forEach(item => {
          const existing = bestByUid.get(item.uid);
          if (!existing || item.score > existing.score) {
            bestByUid.set(item.uid, { entry: item.entry, score: item.score });
          }
        });

        const sortedResults = Array.from(bestByUid.values());
        sortedResults.sort((left, right) => right.score - left.score);
        setScoredResults(sortedResults);
      } catch (error) {
        console.error('Relevance Test Error:', error);
        setErrorMessage(error.message || 'Lỗi khi kiểm tra độ liên quan.');
      } finally {
        setIsTesting(false);
      }
    };

    const semanticThreshold = getSmartScanSettings().semantic_threshold || 0.7;
    useDialogFocus(true, onClose, dialogRef, closeButtonRef);

    return jsxRuntime.jsx('div', {
      className: 'fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'relevance-tester-title',
      children: jsxRuntime.jsxs('div', {
        ref: dialogRef,
        className: 'bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col',
        children: [
          jsxRuntime.jsxs('div', {
            className: 'flex items-center justify-between p-4 border-b border-slate-800',
            children: [
              jsxRuntime.jsx('h2', {
                id: 'relevance-tester-title',
                className: 'text-xl font-bold text-sky-400',
                children: [
                  'Relevance Tester · ',
                  embeddingService.getProviderInfo(getSmartScanSettings().embedding_provider || 'gemini').shortLabel,
                ],
              }),
              jsxRuntime.jsx('button', {
                ref: closeButtonRef,
                onClick: onClose,
                className: 'text-slate-400 hover:text-white ',
                'aria-label': 'Đóng',
                children: '✕',
              }),
            ],
          }),
          jsxRuntime.jsxs('div', {
            className: 'p-4 border-b border-slate-800 bg-slate-800/50',
            children: [
              jsxRuntime.jsxs('div', {
                className: 'flex gap-2',
                children: [
                  jsxRuntime.jsx('input', {
                    type: 'text',
                    'aria-label': 'Truy vấn kiểm tra độ liên quan',
                    value: queryText,
                    onChange: event => setQueryText(event.target.value),
                    onKeyDown: event => event.key === 'Enter' && handleRunRelevanceTest(),
                    placeholder: 'Nhập câu hỏi hoặc ngữ cảnh để kiểm tra...',
                    className: 'flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-sky-500',
                  }),
                  jsxRuntime.jsx('button', {
                    onClick: handleRunRelevanceTest,
                    disabled: isTesting || !queryText.trim(),
                    className: 'bg-sky-600 hover:bg-sky-500 text-white px-6 py-2 rounded-lg font-medium  disabled:opacity-50',
                    children: isTesting ? 'Đang kiểm tra...' : 'Kiểm tra',
                  }),
                ],
              }),
              errorMessage && jsxRuntime.jsx('div', {
                className: 'text-red-400 text-sm mt-2',
                children: errorMessage,
              }),
            ],
          }),
          jsxRuntime.jsxs('div', {
            className: 'flex-1 overflow-y-auto p-4 space-y-2',
            children: [
              scoredResults.length === 0 && !isTesting && !errorMessage && jsxRuntime.jsx('div', {
                className: 'text-center text-slate-500 py-10',
                children: 'Nhập truy vấn để xem các mục Lorebook liên quan nhất.',
              }),
              scoredResults.map((result, index) => {
                const meetsThreshold = result.score >= semanticThreshold;
                return jsxRuntime.jsxs('div', {
                  className: `p-3 rounded-lg border ${
                    meetsThreshold ? 'bg-sky-900/20 border-sky-500/30' : 'bg-slate-800/30 border-slate-700/50'
                  } flex flex-col gap-1`,
                  children: [
                    jsxRuntime.jsxs('div', {
                      className: 'flex justify-between items-start',
                      children: [
                        jsxRuntime.jsx('div', {
                          className: 'font-medium text-slate-200',
                          children: result.entry.keys.join(', '),
                        }),
                        jsxRuntime.jsxs('div', {
                          className: `text-sm font-mono font-bold ${
                            meetsThreshold ? 'text-emerald-400' : 'text-slate-500'
                          }`,
                          children: [(100 * result.score).toFixed(1), '%'],
                        }),
                      ],
                    }),
                    jsxRuntime.jsx('div', {
                      className: 'text-sm text-slate-400 line-clamp-2',
                      children: result.entry.content,
                    }),
                  ],
                }, result.entry.uid || index);
              }),
            ],
          }),
        ],
      }),
    });
  };
}
