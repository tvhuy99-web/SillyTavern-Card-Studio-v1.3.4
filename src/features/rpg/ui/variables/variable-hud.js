// Recovered application UI. The existing React instance and feature dependencies are injected.
// Semantic dependency contract: callers inject named dependencies directly.

export function createVariableHud(getDependencies) {
  return function VariableHud({ variables, isOpen, onClose }) {
    const { VariableTree, Icon, jsxRuntime } = getDependencies();
    if (!isOpen) return null;

    const rootData = variables.stat_data ? variables.stat_data : variables;
    const isEmpty = !rootData || Object.keys(rootData).length === 0;

    return jsxRuntime.jsx('div', {
      className: 'fixed top-16 right-4 bottom-20 w-80 z-40 flex flex-col pointer-events-none',
      children: jsxRuntime.jsxs('div', {
        className: 'pointer-events-auto bg-slate-800/95  border border-slate-600 rounded-xl shadow-2xl flex flex-col max-h-full ',
        role: 'region',
        'aria-labelledby': 'game-hud-title',
        children: [
          jsxRuntime.jsxs('div', {
            className: 'flex justify-between items-center p-3 border-b border-slate-700 bg-slate-900/50 rounded-t-xl shrink-0',
            children: [
              jsxRuntime.jsxs('h3', {
                id: 'game-hud-title',
                className: 'font-bold text-slate-200 flex items-center gap-2',
                children: [
                  jsxRuntime.jsx('span', { className: 'text-lg', children: '📊' }),
                  ' Trạng thái (Game HUD)',
                ],
              }),
              jsxRuntime.jsx('button', {
                onClick: onClose,
                className: 'text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700',
                'aria-label': 'Đóng trạng thái',
                children: jsxRuntime.jsx(Icon, { name: 'close', className: 'h-4 w-4' }),
              }),
            ],
          }),
          jsxRuntime.jsx('div', {
            className: 'p-4 overflow-y-auto custom-scrollbar flex-grow bg-slate-900/30',
            children: isEmpty
              ? jsxRuntime.jsxs('div', {
                  className: 'text-center text-slate-500 italic py-8',
                  children: [
                    jsxRuntime.jsx('p', { children: 'Chưa có dữ liệu biến số.' }),
                    jsxRuntime.jsx('p', {
                      className: 'text-[10px] mt-2',
                      children: 'Bắt đầu trò chuyện để khởi tạo.',
                    }),
                  ],
                })
              : jsxRuntime.jsx('div', {
                  className: 'space-y-2',
                  children: Object.keys(rootData).map(key => jsxRuntime.jsxs('div', {
                    className: 'bg-slate-800/50 p-2 rounded border border-slate-700/50',
                    children: [
                      jsxRuntime.jsx('span', {
                        className: 'text-sky-400 font-bold text-xs mr-2 block mb-1 border-b border-slate-700/50 pb-1',
                        children: key,
                      }),
                      jsxRuntime.jsx(VariableTree, { data: rootData[key] }),
                    ],
                  }, key)),
                }),
          }),
          jsxRuntime.jsx('div', {
            className: 'p-2 border-t border-slate-700 bg-slate-900/50 text-[10px] text-slate-500 text-center shrink-0',
            children: 'Dữ liệu thô từ Memory Store',
          }),
        ],
      }),
    });
  };
}
