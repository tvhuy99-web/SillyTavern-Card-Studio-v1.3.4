export function createRpgDatabaseEditor(getDependencies) {
  return function RpgDatabaseEditor({ isOpen, onClose, database, onSave }) {
    const {
      SearchableSelect,
      createDefaultRpgDatabase,
      useDialogFocus,
      react,
      TextInput,
      useToast,
      TextArea,
      sessionStore,
      buildGeneratedLorebookEntries,
      jsxRuntime,
      ToggleSwitch,
    } = getDependencies();

    const [draftDatabase, setDraftDatabase] = react.useState({ version: 2, tables: [] });
    const [selectedTableId, setSelectedTableId] = react.useState(null);
    const [activeTab, setActiveTab] = react.useState('columns');
    const { setGeneratedLorebookEntries } = sessionStore();
    const { showToast } = useToast();
    const dialogRef = react.useRef(null);
    const closeButtonRef = react.useRef(null);

    useDialogFocus(isOpen, onClose, dialogRef, closeButtonRef);

    react.useEffect(() => {
      if (!isOpen) return;
      if (!database || (database.version || 0) < 2) {
        setDraftDatabase(createDefaultRpgDatabase());
      } else {
        setDraftDatabase(JSON.parse(JSON.stringify(database)));
      }
    }, [isOpen, database]);

    react.useEffect(() => {
      if (draftDatabase.tables.length > 0 && !selectedTableId) {
        setSelectedTableId(draftDatabase.tables[0].config.id);
      }
    }, [draftDatabase.tables]);

    const selectedTable = draftDatabase.tables.find(table => table.config.id === selectedTableId);

    const updateSelectedTableConfig = patch => {
      if (!selectedTableId) return;
      setDraftDatabase(previous => ({
        ...previous,
        tables: previous.tables.map(table => (
          table.config.id === selectedTableId
            ? { ...table, config: { ...table.config, ...patch } }
            : table
        )),
      }));
    };

    const updateAiRule = (ruleKey, ruleValue) => {
      if (!selectedTable) return;
      updateSelectedTableConfig({
        aiRules: { ...selectedTable.config.aiRules, [ruleKey]: ruleValue },
      });
    };

    const updateLorebookLink = (fieldKey, fieldValue) => {
      if (!selectedTable) return;
      updateSelectedTableConfig({
        lorebookLink: {
          ...(selectedTable.config.lorebookLink || { enabled: false, keyColumnId: '' }),
          [fieldKey]: fieldValue,
        },
      });
    };

    const updateColumn = (columnIndex, patch) => {
      if (!selectedTable) return;
      const nextColumns = [...selectedTable.config.columns];
      nextColumns[columnIndex] = { ...nextColumns[columnIndex], ...patch };
      if (patch.label && !patch.id) {
        nextColumns[columnIndex].id = patch.label.toLowerCase().replace(/[^a-z0-9]/g, '_');
      }
      updateSelectedTableConfig({ columns: nextColumns });
    };

    const handleResetTemplate = () => {
      const confirmed = window.confirm(
        'Hành động này sẽ xóa toàn bộ cấu trúc hiện tại và thay thế bằng mẫu mặc định. Bạn có chắc không?',
      );
      if (confirmed) {
        setDraftDatabase(createDefaultRpgDatabase());
        setSelectedTableId(null);
      }
    };

    const handleCopyTableJson = table => {
      try {
        navigator.clipboard.writeText(JSON.stringify(table, null, 2));
        showToast(`Đã sao chép cấu hình bảng "${table.config.name}"`, 'success');
      } catch {
        showToast('Lỗi sao chép dữ liệu bảng.', 'error');
      }
    };

    const handleDeleteTable = tableId => {
      setDraftDatabase(previous => ({
        ...previous,
        tables: previous.tables.filter(table => table.config.id !== tableId),
      }));
      if (selectedTableId === tableId) {
        setSelectedTableId(null);
      }
      showToast('Đã xóa bảng.', 'info');
    };

    const handleAddTable = () => {
      const newTable = {
        config: {
          id: `table_${Date.now()}`,
          name: 'Bảng Mới',
          description: '',
          columns: [{ id: 'name', label: 'Tên', type: 'string' }],
          export: { enabled: true, format: 'markdown_table', strategy: 'always' },
          aiRules: {},
        },
        data: { rows: [] },
      };
      setDraftDatabase(previous => ({
        ...previous,
        tables: [...previous.tables, newTable],
      }));
      setSelectedTableId(newTable.config.id);
    };

    const handleAddColumn = () => {
      if (!selectedTable) return;
      const newColumn = { id: `col_${Date.now()}`, label: 'Cột Mới', type: 'string' };
      updateSelectedTableConfig({ columns: [...selectedTable.config.columns, newColumn] });
    };

    const handleRemoveColumn = columnIndex => {
      if (!selectedTable) return;
      updateSelectedTableConfig({
        columns: selectedTable.config.columns.filter((_col, index) => index !== columnIndex),
      });
    };

    const handleSaveDatabase = () => {
      onSave(draftDatabase);
      try {
        const generatedEntries = buildGeneratedLorebookEntries(draftDatabase);
        setGeneratedLorebookEntries(generatedEntries);
        if (generatedEntries.length > 0) {
          showToast(`[Live-Link] Đã đồng bộ ${generatedEntries.length} mục vào Sổ tay!`, 'success');
        }
      } catch (error) {
        console.error('Live-Link Sync Error:', error);
        showToast('Lỗi đồng bộ Live-Link', 'error');
      }
      onClose();
    };

    if (!isOpen) return null;

    return jsxRuntime.jsx('div', {
      className: 'fixed inset-0 bg-black/80  flex items-center justify-center z-[120] p-4',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'schema-builder-title',
      children: jsxRuntime.jsxs('div', {
        ref: dialogRef,
        className: 'manager-shell schema-manager-shell bg-slate-900 border border-slate-600 rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden',
        children: [
          jsxRuntime.jsxs('div', {
            className: 'p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800',
            children: [
              jsxRuntime.jsxs('h2', {
                id: 'schema-builder-title',
                className: 'text-xl font-bold text-sky-400 flex items-center gap-2',
                children: [
                  ' Schema Builder (V2 - 2D Array)',
                ],
              }),
              jsxRuntime.jsxs('div', {
                className: 'flex gap-2',
                children: [
                  jsxRuntime.jsx('button', {
                    onClick: handleResetTemplate,
                    className: 'px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded border border-slate-600',
                    children: 'Reset Template',
                  }),
                  jsxRuntime.jsx('button', {
                    ref: closeButtonRef,
                    onClick: onClose,
                    className: 'p-2 text-slate-400 hover:text-white rounded hover:bg-slate-700 ',
                    'aria-label': 'Đóng trình chỉnh sửa',
                    children: jsxRuntime.jsx('svg', {
                      xmlns: 'http://www.w3.org/2000/svg',
                      className: 'h-6 w-6',
                      fill: 'none',
                      viewBox: '0 0 24 24',
                      stroke: 'currentColor',
                      'aria-hidden': 'true',
                      children: jsxRuntime.jsx('path', {
                        strokeLinecap: 'round',
                        strokeLinejoin: 'round',
                        strokeWidth: '2',
                        d: 'M6 18L18 6M6 6l12 12',
                      }),
                    }),
                  }),
                ],
              }),
            ],
          }),
          jsxRuntime.jsxs('div', {
            className: 'manager-layout flex flex-grow overflow-hidden',
            children: [
              jsxRuntime.jsxs('div', {
                className: 'manager-sidebar w-64 bg-slate-800/50 border-r border-slate-700 flex flex-col shrink-0',
                children: [
                  jsxRuntime.jsx('div', {
                    className: 'p-3 border-b border-slate-700 font-bold text-slate-300 text-sm uppercase tracking-wider',
                    children: 'Danh Sách Bảng',
                  }),
                  jsxRuntime.jsx('div', {
                    className: 'flex-grow overflow-y-auto p-2 space-y-1 custom-scrollbar',
                    children: draftDatabase.tables.map(table => {
                      const isSelected = selectedTableId === table.config.id;
                      return jsxRuntime.jsxs('div', {
                        className: 'flex items-stretch rounded-lg overflow-hidden mb-1 shadow-sm  hover:shadow-md group',
                        children: [
                          jsxRuntime.jsx('button', {
                            onClick: () => setSelectedTableId(table.config.id),
                            className: `flex-grow text-left px-3 py-2 text-sm truncate  ${
                              isSelected ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`,
                            title: table.config.name,
                            children: table.config.name,
                          }),
                          jsxRuntime.jsxs('div', {
                            className: `flex shrink-0 ${isSelected ? 'bg-sky-700' : 'bg-slate-900'} border-l border-slate-700/30`,
                            children: [
                              jsxRuntime.jsx('button', {
                                onClick: event => {
                                  event.stopPropagation();
                                  handleCopyTableJson(table);
                                },
                                className: `p-2 flex items-center justify-center  ${
                                  isSelected
                                    ? 'text-sky-200 hover:text-white hover:bg-sky-600'
                                    : 'text-slate-500 hover:text-sky-400 hover:bg-slate-800'
                                }`,
                                title: 'Sao chép JSON bảng này',
                                children: jsxRuntime.jsxs('svg', {
                                  'aria-hidden': 'true',
                                  xmlns: 'http://www.w3.org/2000/svg',
                                  className: 'h-4 w-4',
                                  viewBox: '0 0 20 20',
                                  fill: 'currentColor',
                                  children: [
                                    jsxRuntime.jsx('path', {
                                      d: 'M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z',
                                    }),
                                    jsxRuntime.jsx('path', {
                                      d: 'M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z',
                                    }),
                                  ],
                                }),
                              }),
                              jsxRuntime.jsx('button', {
                                onClick: event => {
                                  event.stopPropagation();
                                  handleDeleteTable(table.config.id);
                                },
                                className: `p-2 flex items-center justify-center  ${
                                  isSelected
                                    ? 'text-sky-200 hover:text-red-200 hover:bg-red-600/50'
                                    : 'text-slate-500 hover:text-red-400 hover:bg-slate-800'
                                }`,
                                title: 'Xóa bảng',
                                children: jsxRuntime.jsx('svg', {
                                  'aria-hidden': 'true',
                                  xmlns: 'http://www.w3.org/2000/svg',
                                  className: 'h-4 w-4',
                                  viewBox: '0 0 20 20',
                                  fill: 'currentColor',
                                  children: jsxRuntime.jsx('path', {
                                    fillRule: 'evenodd',
                                    d: 'M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z',
                                    clipRule: 'evenodd',
                                  }),
                                }),
                              }),
                            ],
                          }),
                        ],
                      }, table.config.id);
                    }),
                  }),
                  jsxRuntime.jsx('div', {
                    className: 'p-3 border-t border-slate-700',
                    children: jsxRuntime.jsx('button', {
                      onClick: handleAddTable,
                      className: 'w-full py-2 bg-slate-700 hover:bg-slate-600 text-sky-400 font-bold text-xs rounded border border-slate-600 border-dashed',
                      children: '+ Thêm Bảng Mới',
                    }),
                  }),
                ],
              }),
              jsxRuntime.jsx('div', {
                className: 'flex-grow flex flex-col bg-slate-900/50 overflow-hidden',
                children: selectedTable
                  ? jsxRuntime.jsxs(jsxRuntime.Fragment, {
                      children: [
                        jsxRuntime.jsxs('div', {
                          className: 'p-4 border-b border-slate-700 flex gap-4 items-end',
                          children: [
                            jsxRuntime.jsx('div', {
                              className: 'flex-grow',
                              children: jsxRuntime.jsx(TextInput, {
                                label: 'Tên Bảng',
                                value: selectedTable.config.name,
                                onChange: event => updateSelectedTableConfig({ name: event.target.value }),
                              }),
                            }),
                            jsxRuntime.jsxs('div', {
                              className: 'flex bg-slate-800 rounded-lg p-1 border border-slate-700 h-10',
                              children: [
                                jsxRuntime.jsx('button', {
                                  onClick: () => setActiveTab('columns'),
                                  className: `px-4 text-xs font-bold rounded  ${
                                    activeTab === 'columns' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                                  }`,
                                  children: 'Cột',
                                }),
                                jsxRuntime.jsx('button', {
                                  onClick: () => setActiveTab('rules'),
                                  className: `px-4 text-xs font-bold rounded  ${
                                    activeTab === 'rules' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                                  }`,
                                  children: 'Luật AI',
                                }),
                                jsxRuntime.jsx('button', {
                                  onClick: () => setActiveTab('link'),
                                  className: `px-4 text-xs font-bold rounded  ${
                                    activeTab === 'link' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                                  }`,
                                  children: 'Live-Link',
                                }),
                              ],
                            }),
                          ],
                        }),
                        jsxRuntime.jsxs('div', {
                          className: 'flex-grow overflow-y-auto p-6 custom-scrollbar',
                          children: [
                            activeTab === 'columns' && jsxRuntime.jsxs('div', {
                              className: 'space-y-4',
                              children: [
                                jsxRuntime.jsxs('div', {
                                  className: 'flex justify-between items-center mb-2',
                                  children: [
                                    jsxRuntime.jsx('h3', {
                                      className: 'text-sm font-bold text-slate-300',
                                      children: 'Cấu trúc Cột',
                                    }),
                                    jsxRuntime.jsx('button', {
                                      onClick: handleAddColumn,
                                      className: 'text-xs bg-sky-600/20 text-sky-400 px-3 py-1 rounded hover:bg-sky-600/40',
                                      children: '+ Thêm',
                                    }),
                                  ],
                                }),
                                jsxRuntime.jsx('div', {
                                  className: 'grid gap-3',
                                  children: selectedTable.config.columns.map((column, colIndex) => jsxRuntime.jsxs('div', {
                                    className: 'flex gap-3 items-center bg-slate-800 p-3 rounded border border-slate-700',
                                    children: [
                                      jsxRuntime.jsx('div', {
                                        className: 'w-8 text-center text-slate-500 font-mono text-xs',
                                        children: colIndex,
                                      }),
                                      jsxRuntime.jsx('input', {
                                        type: 'text',
                                        value: column.label,
                                        'aria-label': `Tên hiển thị cột ${colIndex + 1}`,
                                        onChange: event => updateColumn(colIndex, { label: event.target.value }),
                                        className: 'flex-grow bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm text-white',
                                        placeholder: 'Tên hiển thị',
                                      }),
                                      jsxRuntime.jsx('input', {
                                        type: 'text',
                                        value: column.id,
                                        'aria-label': `Key ID cột ${colIndex + 1}`,
                                        onChange: event => updateColumn(colIndex, { id: event.target.value }),
                                        className: 'w-32 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-indigo-300 font-mono',
                                        placeholder: 'Key ID',
                                      }),
                                      jsxRuntime.jsxs('select', {
                                        value: column.type,
                                        'aria-label': `Kiểu dữ liệu cột ${colIndex + 1}`,
                                        onChange: event => updateColumn(colIndex, { type: event.target.value }),
                                        className: 'bg-slate-900 border border-slate-600 rounded px-2 py-1 text-xs text-slate-300 w-24',
                                        children: [
                                          jsxRuntime.jsx('option', { value: 'string', children: 'Text' }),
                                          jsxRuntime.jsx('option', { value: 'number', children: 'Number' }),
                                          jsxRuntime.jsx('option', { value: 'boolean', children: 'Bool' }),
                                        ],
                                      }),
                                      jsxRuntime.jsx('button', {
                                        onClick: () => handleRemoveColumn(colIndex),
                                        className: 'text-red-400 hover:bg-red-900/30 p-1 rounded',
                                        'aria-label': `Xóa cột ${column.label}`,
                                        children: '×',
                                      }),
                                    ],
                                  }, colIndex)),
                                }),
                              ],
                            }),
                            activeTab === 'rules' && jsxRuntime.jsxs('div', {
                              className: 'space-y-6',
                              children: [
                                jsxRuntime.jsx(TextArea, {
                                  label: 'Mô tả chung (Description)',
                                  value: selectedTable.config.description || '',
                                  onChange: event => updateSelectedTableConfig({ description: event.target.value }),
                                  rows: 2,
                                }),
                                jsxRuntime.jsxs('div', {
                                  className: 'grid grid-cols-1 md:grid-cols-2 gap-6',
                                  children: [
                                    jsxRuntime.jsx(TextArea, {
                                      label: 'Luật Cập nhật (Update Rule)',
                                      value: selectedTable.config.aiRules?.update || '',
                                      onChange: event => updateAiRule('update', event.target.value),
                                      rows: 4,
                                    }),
                                    jsxRuntime.jsx(TextArea, {
                                      label: 'Luật Thêm mới (Insert Rule)',
                                      value: selectedTable.config.aiRules?.insert || '',
                                      onChange: event => updateAiRule('insert', event.target.value),
                                      rows: 4,
                                    }),
                                    jsxRuntime.jsx(TextArea, {
                                      label: 'Luật Xóa (Delete Rule)',
                                      value: selectedTable.config.aiRules?.delete || '',
                                      onChange: event => updateAiRule('delete', event.target.value),
                                      rows: 4,
                                    }),
                                  ],
                                }),
                              ],
                            }),
                            activeTab === 'link' && jsxRuntime.jsxs('div', {
                              className: 'space-y-6',
                              children: [
                                jsxRuntime.jsxs('div', {
                                  className: 'bg-emerald-900/20 border border-emerald-500/30 p-4 rounded-lg',
                                  children: [
                                    jsxRuntime.jsx('h3', {
                                      className: 'font-bold text-emerald-400 mb-2',
                                      children: 'Live-Link (Tự động hóa Lorebook)',
                                    }),
                                    jsxRuntime.jsx('p', {
                                      className: 'text-sm text-slate-300',
                                      children: 'Biến mỗi dòng trong bảng này thành một mục World Info (Sổ tay) động. Dữ liệu sẽ được tự động đồng bộ sau mỗi lượt chat.',
                                    }),
                                    jsxRuntime.jsx('div', {
                                      className: 'mt-4 bg-black/20 p-2 rounded text-xs text-slate-400 font-mono',
                                      children: 'Logic: Khi kích hoạt, nội dung bảng này sẽ bị ẩn khỏi Prompt chính để tiết kiệm Token. Thay vào đó, các dòng dữ liệu sẽ trở thành các mục World Info có thể được tìm kiếm (Smart Scan) hoặc kích hoạt bằng từ khóa.',
                                    }),
                                  ],
                                }),
                                jsxRuntime.jsxs('div', {
                                  className: 'space-y-4',
                                  children: [
                                    jsxRuntime.jsx(ToggleSwitch, {
                                      label: 'Kích hoạt Live-Link cho bảng này',
                                      checked: selectedTable.config.lorebookLink?.enabled || false,
                                      onChange: checked => updateLorebookLink('enabled', checked),
                                    }),
                                    jsxRuntime.jsxs('div', {
                                      className: `  ${selectedTable.config.lorebookLink?.enabled ? '' : 'opacity-50 pointer-events-none'}`,
                                      children: [
                                        jsxRuntime.jsx(SearchableSelect, {
                                          label: 'Cột Từ khóa (Key Column)',
                                          value: selectedTable.config.lorebookLink?.keyColumnId || '',
                                          onChange: event => updateLorebookLink('keyColumnId', event.target.value),
                                          options: [
                                            { value: '', label: '-- Chọn cột làm từ khóa --' },
                                            ...selectedTable.config.columns.map(column => ({
                                              value: column.id,
                                              label: column.label,
                                            })),
                                          ],
                                          tooltip: "Giá trị của cột này sẽ được dùng làm 'Keys' cho mục World Info tương ứng.",
                                        }),
                                        jsxRuntime.jsx('p', {
                                          className: 'text-xs text-slate-500 mt-1',
                                          children: 'Ví dụ: Chọn cột "Tên Vật Phẩm". Khi dòng có tên "Kiếm Thần", hệ thống sẽ tạo mục WI với key ["Kiếm Thần"].',
                                        }),
                                      ],
                                    }),
                                  ],
                                }),
                              ],
                            }),
                          ],
                        }),
                      ],
                    })
                  : jsxRuntime.jsx('div', {
                      className: 'flex items-center justify-center h-full text-slate-500 italic',
                      children: 'Chọn bảng để sửa',
                    }),
              }),
            ],
          }),
          jsxRuntime.jsxs('div', {
            className: 'p-4 border-t border-slate-700 bg-slate-800 flex justify-end gap-3',
            children: [
              jsxRuntime.jsx('button', {
                onClick: onClose,
                className: 'px-4 py-2 text-sm font-bold rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300',
                children: 'Hủy',
              }),
              jsxRuntime.jsx('button', {
                onClick: handleSaveDatabase,
                className: 'px-6 py-2 text-sm font-bold rounded-lg bg-sky-600 hover:bg-sky-500 text-white',
                children: 'Lưu Cấu Trúc',
              }),
            ],
          }),
        ],
      }),
    });
  };
}
