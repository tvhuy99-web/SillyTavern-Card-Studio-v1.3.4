// Recovered application UI. The existing React instance and feature dependencies are injected.
// Semantic dependency contract: callers inject named dependencies directly.

export function createVariableTree(getDependencies) {
  return function VariableTree({ data, level = 0 }) {
    const { react, jsxRuntime } = getDependencies();
    const [isExpanded, setIsExpanded] = react.useState(level < 2);

    if (typeof data === 'object' && data) {
      const isArray = Array.isArray(data);
      const keys = Object.keys(data);
      if (keys.length === 0) {
        return jsxRuntime.jsx('span', {
          className: 'text-slate-500 italic text-xs',
          children: isArray ? '[]' : '{}',
        });
      }
      if (isArray && data.length === 2 && typeof data[1] === 'string') {
        return jsxRuntime.jsxs('span', {
          className: 'inline-flex gap-2 items-baseline',
          children: [
            jsxRuntime.jsx('strong', { className: 'text-sky-300', children: String(data[0]) }),
            jsxRuntime.jsxs('span', {
              className: 'text-slate-500 text-[10px] italic',
              children: ['(', data[1], ')'],
            }),
          ],
        });
      }
      return jsxRuntime.jsxs('div', {
        className: 'ml-2',
        children: [
          jsxRuntime.jsxs('div', {
            className: 'cursor-pointer hover:text-sky-400 text-slate-400 select-none flex items-center gap-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400',
            role: 'button',
            tabIndex: 0,
            'aria-expanded': isExpanded,
            onClick: event => {
              event.stopPropagation();
              setIsExpanded(!isExpanded);
            },
            onKeyDown: event => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                setIsExpanded(!isExpanded);
              }
            },
            children: [
              jsxRuntime.jsx('span', { className: 'text-[10px]', children: isExpanded ? '▼' : '▶' }),
              jsxRuntime.jsx('span', {
                className: 'text-xs font-semibold',
                children: isArray ? `Array(${keys.length})` : 'Object',
              }),
            ],
          }),
          isExpanded && jsxRuntime.jsx('div', {
            className: 'border-l border-slate-700 pl-2 ml-1',
            children: keys.map(childKey => jsxRuntime.jsxs('div', {
              className: 'mt-1',
              children: [
                jsxRuntime.jsxs('span', {
                  className: 'text-indigo-300 text-xs mr-1',
                  children: [childKey, ':'],
                }),
                jsxRuntime.jsx(VariableTree, { data: data[childKey], level: level + 1 }),
              ],
            }, childKey)),
          }),
        ],
      });
    }

    let valueClass = 'text-slate-300';
    if (typeof data === 'number') {
      valueClass = 'text-amber-400 font-mono';
    } else if (typeof data === 'boolean') {
      valueClass = 'text-purple-400 font-bold';
    } else if (typeof data === 'string') {
      valueClass = 'text-green-300';
    }

    return jsxRuntime.jsx('span', {
      className: `${valueClass} text-xs break-words`,
      children: String(data),
    });
  };
}
