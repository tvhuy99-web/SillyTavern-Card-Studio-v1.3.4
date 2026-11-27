export function createRpgTableRow(getDependencies) {
  return function RpgTableRow({
    row,
    columns,
    rowIndex,
    onCellUpdate,
    onToggleDelete,
    onRestore,
    isPendingDelete,
    isExpanded,
    onToggleExpand,
  }) {
    const { RpgCellEditor, Icon, jsxRuntime } = getDependencies();
    const primaryCell = row[1];

    if (isPendingDelete) {
      return jsxRuntime.jsxs('div', {
        className: 'mb-2 flex items-center justify-between p-3 bg-red-900/10 border border-red-900/30 rounded-lg   select-none',
        children: [
          jsxRuntime.jsxs('div', {
            className: 'flex items-center gap-3 overflow-hidden text-red-400',
            children: [
              jsxRuntime.jsxs('span', {
                className: 'text-xs font-mono opacity-50 w-6 text-center',
                children: ['#', rowIndex + 1],
              }),
              jsxRuntime.jsx('span', {
                className: 'text-sm font-medium line-through truncate opacity-70',
                children: primaryCell || '(Dữ liệu trống)',
              }),
            ],
          }),
          jsxRuntime.jsxs('button', {
            onClick: event => {
              event.stopPropagation();
              onRestore();
            },
            className: 'px-3 py-1.5 text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white rounded border border-slate-600  flex items-center gap-1 shadow-sm hover:shadow-md',
            children: [
              jsxRuntime.jsx(Icon, { name: 'undo', className: 'h-3.5 w-3.5' }),
              'Hoàn tác',
            ],
          }),
        ],
      });
    }

    return jsxRuntime.jsxs('div', {
      className: 'mb-2',
      children: [
        jsxRuntime.jsxs('div', {
          className: 'flex items-stretch rounded-lg shadow-sm overflow-hidden   hover:shadow-md',
          children: [
            jsxRuntime.jsxs('button', {
              onClick: onToggleExpand,
              'aria-expanded': isExpanded,
              className: `flex-grow flex items-center gap-3 px-4 py-3 text-left   border border-r-0 rounded-l-lg outline-none focus:ring-2 focus:ring-sky-500/50 group ${
                isExpanded
                  ? 'bg-slate-700 border-slate-600 text-sky-400'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750 hover:text-white hover:border-slate-600'
              }`,
              children: [
                jsxRuntime.jsx('div', {
                  className: `  text-slate-500 group-hover:text-sky-400 ${isExpanded ? 'rotate-90 text-sky-400' : ''}`,
                  children: jsxRuntime.jsx(Icon, { name: 'chevronRight', className: 'h-4 w-4' }),
                }),
                jsxRuntime.jsxs('span', {
                  className: 'font-mono text-xs text-slate-500 w-6 text-center',
                  children: ['#', rowIndex + 1],
                }),
                jsxRuntime.jsx('span', {
                  className: `font-bold text-sm truncate flex-grow ${primaryCell ? '' : 'italic opacity-50'}`,
                  children: primaryCell || '(Chưa đặt tên)',
                }),
                jsxRuntime.jsx('span', {
                  className: 'text-[10px] uppercase font-bold text-slate-500 opacity-0 group-hover:opacity-100 ',
                  children: isExpanded ? 'Thu gọn' : 'Chi tiết',
                }),
              ],
            }),
            jsxRuntime.jsx('button', {
              onClick: event => {
                event.stopPropagation();
                onToggleDelete();
              },
              className: `px-3 flex items-center justify-center border rounded-r-lg   outline-none focus:ring-2 focus:ring-red-500/50 active:bg-slate-900 ${
                isExpanded
                  ? 'bg-slate-700 border-slate-600 text-slate-500 hover:text-red-400 hover:bg-slate-600'
                  : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-red-400 hover:bg-slate-750 hover:border-slate-600'
              }`,
              title: 'Xóa dòng này',
              'aria-label': 'Xóa dòng này',
              children: jsxRuntime.jsx(Icon, { name: 'trash', className: 'h-4 w-4' }),
            }),
          ],
        }),
        isExpanded && jsxRuntime.jsx('div', {
          className: 'relative mt-1 mx-1 p-4 bg-slate-900/80 border border-slate-700 rounded-b-lg border-t-0 shadow-inner  before:absolute before:top-0 before:left-0 before:right-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-slate-600 before:to-transparent',
          children: jsxRuntime.jsx('div', {
            className: 'grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5',
            children: columns.map((column, colIndex) => jsxRuntime.jsx(RpgCellEditor, {
              value: row[colIndex + 1],
              column,
              onSave: nextValue => onCellUpdate(colIndex, nextValue),
            }, column.id)),
          }),
        }),
      ],
    });
  };
}
