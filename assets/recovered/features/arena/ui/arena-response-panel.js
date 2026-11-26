export function createArenaResponsePanel(getDependencies) {
  return function ArenaResponsePanel({ message, onSelect, onRetry }) {
    const { ArenaResponseSide, jsxRuntime } = getDependencies();
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
