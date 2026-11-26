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
      } = getDependencies();

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
