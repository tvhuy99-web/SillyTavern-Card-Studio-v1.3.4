// Recovered application UI. The existing React instance and feature dependencies are injected.
// Semantic dependency contract: callers inject named dependencies directly.

export function createRpgHud(getDependencies) {
  return function RpgHud({ data, isOpen, onClose }) {
    const {
      RpgImportDialog,
      RpgTableEditor,
      react,
      useToast,
      characterStore,
      Icon,
      sessionStore,
      buildGeneratedLorebookEntries,
      jsxRuntime,
    } = getDependencies();

    const [activeSectionId, setActiveSectionId] = react.useState(null);
    const { reloadRpgConfig, card, setSessionData } = sessionStore();
    const { characters } = characterStore();
    const { showToast } = useToast();

    react.useEffect(() => {
      if (isOpen && !activeSectionId && data?.tables?.length) {
        setActiveSectionId(data.tables[0].config.id);
      }
    }, [isOpen, data, activeSectionId]);

    if (!isOpen || !data) return null;

    const selectedTable = data.tables ? data.tables.find(table => table.config.id === activeSectionId) : undefined;
    const isDataManagerActive = activeSectionId === 'data_manager';

    const handleSyncConfigFromCard = () => {
      if (!card) return;
      const sourceCharacter = characters.find(character => character.fileName === card.fileName);
      if (sourceCharacter && sourceCharacter.card.rpg_data) {
        reloadRpgConfig(sourceCharacter.card.rpg_data);
        showToast('Đã đồng bộ cấu hình từ thẻ gốc thành công!', 'success');
      } else {
        showToast('Không tìm thấy dữ liệu RPG gốc trong Thẻ nhân vật.', 'error');
      }
    };

    const handleCopyTable = async table => {
      try {
        if (!navigator.clipboard?.writeText) {
          throw new Error('Clipboard API unavailable');
        }
        await navigator.clipboard.writeText(JSON.stringify(table, null, 2));
        showToast(`Đã sao chép bảng "${table.config.name}" vào clipboard.`, 'success');
      } catch {
        showToast('Lỗi sao chép bảng.', 'error');
      }
    };

    const handleImportDatabase = importedDatabase => {
      if (!card) return;
      const updatedCard = { ...card, rpg_data: importedDatabase };
      const generatedEntries = buildGeneratedLorebookEntries(importedDatabase);
      setSessionData({ card: updatedCard, generatedLorebookEntries: generatedEntries });
    };

    return jsxRuntime.jsxs('div', {
      className: 'fixed inset-y-0 right-0 z-[100] w-[600px] max-w-full bg-slate-900/95  border-l border-slate-700 shadow-2xl flex flex-col   ',
      role: 'dialog',
      'aria-labelledby': 'mythic-dashboard-title',
      children: [
        jsxRuntime.jsxs('div', {
          className: 'p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/50',
          children: [
            jsxRuntime.jsxs('div', {
              children: [
                jsxRuntime.jsxs('h2', {
                  id: 'mythic-dashboard-title',
                  className: 'text-xl font-bold text-sky-400 flex items-center gap-2',
                  children: [
                    jsxRuntime.jsx('span', { children: '⚔️' }),
                    ' Mythic Dashboard',
                  ],
                }),
                jsxRuntime.jsxs('p', {
                  className: 'text-xs text-slate-400 font-mono mt-1',
                  children: [
                    'Live Editor • Update: ',
                    data.lastUpdated ? new Date(data.lastUpdated).toLocaleTimeString() : 'N/A',
                  ],
                }),
              ],
            }),
            jsxRuntime.jsxs('div', {
              className: 'flex items-center gap-2',
              children: [
                jsxRuntime.jsxs('button', {
                  onClick: handleSyncConfigFromCard,
                  className: 'px-3 py-1.5 text-xs font-bold bg-amber-600/20 text-amber-400 hover:bg-amber-600 hover:text-white border border-amber-500/30 rounded  flex items-center gap-1',
                  title: 'Nạp lại cấu hình (Cột, Luật, Live-Link) từ Thẻ gốc nhưng giữ nguyên Dữ liệu chơi.',
                  children: [
                    jsxRuntime.jsx(Icon, { name: 'sync', className: 'h-4 w-4' }),
                    'Đồng bộ Cấu hình',
                  ],
                }),
                jsxRuntime.jsx('button', {
                  onClick: onClose,
                  className: 'p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-full ',
                  'aria-label': 'Đóng bảng điều khiển RPG',
                  children: jsxRuntime.jsx(Icon, { name: 'close', className: 'h-4 w-4' }),
                }),
              ],
            }),
          ],
        }),
        jsxRuntime.jsxs('div', {
          className: 'flex-grow flex overflow-hidden',
          children: [
            jsxRuntime.jsxs('div', {
              className: 'w-44 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0',
              children: [
                jsxRuntime.jsx('div', {
                  className: 'flex-grow overflow-y-auto custom-scrollbar py-2',
                  children: data.tables && data.tables.map(table => jsxRuntime.jsxs('div', {
                    className: 'flex items-center group',
                    children: [
                      jsxRuntime.jsxs('button', {
                        onClick: () => setActiveSectionId(table.config.id),
                        className: `flex-grow px-3 py-3 text-left text-sm font-medium  border-l-4 ${
                          table.config.id === activeSectionId
                            ? 'bg-slate-800 text-sky-400 border-sky-500'
                            : 'border-transparent text-slate-400 hover:bg-slate-900 hover:text-slate-200'
                        }`,
                        children: [
                          jsxRuntime.jsx('div', { className: 'truncate', children: table.config.name }),
                          jsxRuntime.jsxs('div', {
                            className: 'text-[10px] text-slate-600 font-normal mt-0.5',
                            children: [table.data.rows.length, ' rows'],
                          }),
                        ],
                      }),
                      jsxRuntime.jsx('button', {
                        onClick: event => {
                          event.stopPropagation();
                          handleCopyTable(table);
                        },
                        className: 'p-2 text-slate-600 hover:text-sky-400 opacity-0 group-hover:opacity-100 ',
                        title: 'Sao chép bảng này',
                        children: jsxRuntime.jsx(Icon, { name: 'copy', className: 'h-4 w-4' }),
                      }),
                    ],
                  }, table.config.id)),
                }),
                jsxRuntime.jsx('div', {
                  className: 'p-2 border-t border-slate-800',
                  children: jsxRuntime.jsxs('button', {
                    onClick: () => setActiveSectionId('data_manager'),
                    className: `w-full py-2 px-3 rounded text-xs font-bold flex items-center justify-center gap-2  ${
                      activeSectionId === 'data_manager'
                        ? 'bg-sky-900/50 text-sky-400 border border-sky-500/30'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                    }`,
                    children: [
                      jsxRuntime.jsx(Icon, { name: 'settings', className: 'h-4 w-4' }),
                      'Quản lý Dữ liệu',
                    ],
                  }),
                }),
              ],
            }),
            jsxRuntime.jsx('div', {
              className: 'flex-grow overflow-hidden bg-slate-900/50 flex flex-col relative',
              children: isDataManagerActive
                ? jsxRuntime.jsx(RpgImportDialog, {
                    database: data,
                    onImport: handleImportDatabase,
                  })
                : selectedTable
                  ? jsxRuntime.jsxs('div', {
                      className: 'flex flex-col h-full p-4 gap-4',
                      children: [
                        jsxRuntime.jsx('div', {
                          className: 'flex justify-between items-end border-b border-slate-700/50 pb-2 shrink-0',
                          children: jsxRuntime.jsxs('div', {
                            children: [
                              jsxRuntime.jsx('h3', {
                                className: 'text-lg font-bold text-white',
                                children: selectedTable.config.name,
                              }),
                              jsxRuntime.jsx('p', {
                                className: 'text-xs text-slate-400 italic max-w-lg truncate',
                                children: selectedTable.config.description || 'Không có mô tả',
                              }),
                            ],
                          }),
                        }),
                        jsxRuntime.jsx('div', {
                          className: 'flex-grow overflow-hidden border border-slate-700 rounded-lg',
                          children: jsxRuntime.jsx(RpgTableEditor, { table: selectedTable }),
                        }),
                      ],
                    })
                  : jsxRuntime.jsxs('div', {
                      className: 'flex items-center justify-center h-full text-slate-500 italic flex-col gap-2',
                      children: [
                        jsxRuntime.jsx('span', { className: 'text-4xl', children: '🗂️' }),
                        jsxRuntime.jsx('span', { children: 'Chọn bảng dữ liệu để chỉnh sửa' }),
                      ],
                    }),
            }),
          ],
        }),
      ],
    });
  };
}
