// The caller owns generation; this component only exposes the existing action.
export function createGenerateEntryButton({ jsx, jsxs }) {
  return function GenerateEntryButton({ onOpen }) {
    return jsxs('div', {
      className: 'p-2',
      children: [
        jsxs('button', {
          onClick: onOpen,
          className: 'w-full text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded-lg border border-indigo-400/30  shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2',
          children: [jsx('span', { className: 'text-lg', 'aria-hidden': 'true', children: '✨' }), jsx('span', { children: 'Tạo Mục Sổ tay Mới với AI' })],
        }),
        jsx('p', { className: 'text-[10px] text-slate-500 text-center mt-2', children: 'Sử dụng ngữ cảnh hội thoại hiện tại để tạo nội dung World Info tự động.' }),
      ],
    });
  };
}
