// Recovered application UI. The existing React instance and feature dependencies are injected.
// Semantic dependency contract: callers inject named dependencies directly.

export function createRpgTableEditor(getDependencies) {
  return function RpgTableEditor({ table }) {
    const {
      RpgTableRow,
      react,
      useToast,
      Icon,
      sessionStore,
      jsxRuntime,
    } = getDependencies();

    const { config: tableConfig } = table;
    const { replaceRpgTableRows } = sessionStore();
    const { showToast } = useToast();

    const [draftRows, setDraftRows] = react.useState([]);
    const [pendingDeleteIndices, setPendingDeleteIndices] = react.useState(new Set());
    const [isDirty, setIsDirty] = react.useState(false);
    const [expandedIndices, setExpandedIndices] = react.useState(new Set());

    react.useEffect(() => {
      if (table.data.rows) {
        setDraftRows(JSON.parse(JSON.stringify(table.data.rows)));
        setPendingDeleteIndices(new Set());
        setExpandedIndices(new Set());
        setIsDirty(false);
      }
    }, [table.config.id, table.data.rows]);

    const handleAddRow = () => {
      const rowId = `row_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const newRow = Array(tableConfig.columns.length + 1).fill('');
      newRow[0] = rowId;
      setDraftRows(previous => [...previous, newRow]);
      setExpandedIndices(previous => new Set(previous).add(draftRows.length));
      setIsDirty(true);
    };

    const handleCellUpdate = (rowIndex, colIndex, nextValue) => {
      setDraftRows(previous => {
        const nextRows = [...previous];
        nextRows[rowIndex] = [...nextRows[rowIndex]];
        nextRows[rowIndex][colIndex + 1] = nextValue;
        return nextRows;
      });
      setIsDirty(true);
    };

    const handleToggleDeleteRow = rowIndex => {
      setPendingDeleteIndices(previous => {
        const nextSet = new Set(previous);
        if (nextSet.has(rowIndex)) {
          nextSet.delete(rowIndex);
        } else {
          nextSet.add(rowIndex);
          if (expandedIndices.has(rowIndex)) {
            const nextExpanded = new Set(expandedIndices);
            nextExpanded.delete(rowIndex);
            setExpandedIndices(nextExpanded);
          }
        }
        return nextSet;
      });
      setIsDirty(true);
    };

    const handleRestoreRow = rowIndex => {
      setPendingDeleteIndices(previous => {
        const nextSet = new Set(previous);
        nextSet.delete(rowIndex);
        return nextSet;
      });
      setIsDirty(true);
    };

    const handleToggleExpandRow = rowIndex => {
      setExpandedIndices(previous => {
        const nextSet = new Set(previous);
        if (nextSet.has(rowIndex)) {
          nextSet.delete(rowIndex);
        } else {
          nextSet.add(rowIndex);
        }
        return nextSet;
      });
    };

    const handleDiscardChanges = () => {
      if (confirm('Bạn có chắc muốn hủy mọi thay đổi chưa lưu?')) {
        setDraftRows(JSON.parse(JSON.stringify(table.data.rows)));
        setPendingDeleteIndices(new Set());
        setExpandedIndices(new Set());
        setIsDirty(false);
      }
    };

    const handleSaveChanges = () => {
      const remainingRows = draftRows.filter((_row, index) => !pendingDeleteIndices.has(index));
      replaceRpgTableRows(tableConfig.id, remainingRows);
      setIsDirty(false);
      setPendingDeleteIndices(new Set());
      showToast('Đã lưu thay đổi vào cơ sở dữ liệu!', 'success');
    };

    const activeRowCount = draftRows.length - pendingDeleteIndices.size;
    const pendingDeleteCount = pendingDeleteIndices.size;

    return jsxRuntime.jsxs('div', {
      className: 'flex flex-col h-full bg-slate-900/50',
      children: [
        jsxRuntime.jsxs('div', {
          className: 'px-4 py-3 border-b border-slate-700/50 flex flex-wrap justify-between items-center text-xs bg-slate-800/30 gap-2',
          children: [
            jsxRuntime.jsxs('div', {
              className: 'text-slate-400',
              children: [
                jsxRuntime.jsxs('span', {
                  children: [
                    'Tổng: ',
                    jsxRuntime.jsx('strong', { className: 'text-sky-400', children: activeRowCount }),
                  ],
                }),
                pendingDeleteCount > 0 && jsxRuntime.jsxs('span', {
                  className: 'text-red-400 ml-2',
                  children: ['(', pendingDeleteCount, ' chờ xóa)'],
                }),
                isDirty && jsxRuntime.jsx('span', {
                  className: 'text-amber-400 font-bold italic ml-2',
                  children: '● Chưa lưu',
                }),
              ],
            }),
            jsxRuntime.jsxs('div', {
              className: 'flex gap-2',
              children: [
                jsxRuntime.jsx('button', {
                  onClick: () => setExpandedIndices(new Set(draftRows.map((_row, index) => index))),
                  className: 'px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-600 ',
                  title: 'Mở rộng tất cả',
                  children: jsxRuntime.jsx(Icon, { name: 'expand', className: 'h-4 w-4' }),
                }),
                jsxRuntime.jsx('button', {
                  onClick: () => setExpandedIndices(new Set()),
                  className: 'px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-600 ',
                  title: 'Thu gọn tất cả',
                  children: jsxRuntime.jsx(Icon, { name: 'collapse', className: 'h-4 w-4' }),
                }),
              ],
            }),
          ],
        }),
        jsxRuntime.jsx('div', {
          className: 'flex-grow overflow-y-auto custom-scrollbar p-4 space-y-2',
          children: draftRows.length === 0
            ? jsxRuntime.jsxs('div', {
                className: 'flex flex-col items-center justify-center h-40 text-slate-500 italic border-2 border-dashed border-slate-700/50 rounded-lg',
                children: [
                  jsxRuntime.jsx('p', { children: 'Bảng trống.' }),
                  jsxRuntime.jsx('button', {
                    onClick: handleAddRow,
                    className: 'mt-2 text-sky-400 hover:underline text-sm font-bold',
                    children: 'Thêm dòng mới ngay',
                  }),
                ],
              })
            : draftRows.map((row, rowIndex) => jsxRuntime.jsx(RpgTableRow, {
                row,
                columns: tableConfig.columns,
                rowIndex,
                onCellUpdate: (colIndex, nextValue) => handleCellUpdate(rowIndex, colIndex, nextValue),
                onToggleDelete: () => handleToggleDeleteRow(rowIndex),
                onRestore: () => handleRestoreRow(rowIndex),
                isPendingDelete: pendingDeleteIndices.has(rowIndex),
                isExpanded: expandedIndices.has(rowIndex),
                onToggleExpand: () => handleToggleExpandRow(rowIndex),
              }, row[0])),
        }),
        jsxRuntime.jsxs('div', {
          className: 'border-t border-slate-700 p-3 bg-slate-800 rounded-b-lg flex items-center gap-3 z-10 shadow-up',
          children: [
            jsxRuntime.jsxs('button', {
              onClick: handleAddRow,
              className: 'flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold rounded shadow-sm  border border-slate-600',
              children: [
                jsxRuntime.jsx(Icon, { name: 'plus', className: 'h-4 w-4' }),
                'Thêm Dòng',
              ],
            }),
            jsxRuntime.jsx('div', { className: 'flex-grow' }),
            isDirty && jsxRuntime.jsxs(jsxRuntime.Fragment, {
              children: [
                jsxRuntime.jsx('button', {
                  onClick: handleDiscardChanges,
                  className: 'px-4 py-2 text-slate-400 hover:text-white text-xs font-bold ',
                  children: 'Hủy bỏ',
                }),
                jsxRuntime.jsxs('button', {
                  onClick: handleSaveChanges,
                  className: 'flex items-center gap-2 px-6 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded shadow-lg shadow-sky-900/20  active:scale-95',
                  children: [
                    jsxRuntime.jsx(Icon, { name: 'save', className: 'h-4 w-4' }),
                    'Lưu Thay Đổi',
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
