export function createImmersiveContainer({ jsx }) {
  return function ImmersiveContainer({ children, isImmersive, globalClass = '' }) {
    const layout = isImmersive
      ? 'fixed inset-0 z-50 bg-slate-900 flex flex-col'
      : 'bg-slate-800/50 rounded-xl shadow-lg flex flex-col flex-grow h-[80vh] min-h-0 relative overflow-hidden';
    return jsx('div', { className: `${layout} ${globalClass}`, children });
  };
}

export function createLoadOlderButton({ jsx, jsxs }) {
  return function LoadOlderButton({ visibleCount, totalCount, onLoadMore, step = 10 }) {
    if (visibleCount >= totalCount) return null;
    const remaining = totalCount - visibleCount;
    return jsx('div', {
      className: 'flex justify-center mt-2 mb-4',
      children: jsxs('button', {
        onClick(event) { event.stopPropagation(); onLoadMore(); },
        className: 'text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 rounded-full px-4 py-1 ',
        children: ['Tải thêm ', Math.min(remaining, step), ' dòng cũ hơn... (Còn ', remaining, ')'],
      }),
    });
  };
}

export function createLoadingIndicator({ jsx, jsxs }) {
  return function LoadingIndicator({ message = 'Đang tải...' }) {
    return jsxs('div', {
      className: 'flex items-center justify-center gap-2 text-slate-300', role: 'status', 'aria-live': 'polite',
      children: [
        jsx('span', { className: 'sr-only', children: message }),
        jsxs('svg', {
          className: ' h-5 w-5', xmlns: 'http://www.w3.org/2000/svg', fill: 'none', viewBox: '0 0 24 24', 'aria-hidden': 'true',
          children: [
            jsx('circle', { className: 'opacity-25', cx: '12', cy: '12', r: '10', stroke: 'currentColor', strokeWidth: '4' }),
            jsx('path', { className: 'opacity-75', fill: 'currentColor', d: 'M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z' }),
          ],
        }),
        message && jsx('span', { 'aria-hidden': 'true', children: message }),
      ],
    });
  };
}
