// Recovered application UI. The existing React instance and feature dependencies are injected.
// Semantic dependency contract: callers inject named dependencies directly.

function resolveRpgDependencies(getDependencies) {
  const deps = getDependencies();
  return {
    react: deps.react,
    jsxRuntime: deps.jsxRuntime,
    useToast: deps.useToast,
    sessionStore: deps.sessionStore,
    characterStore: deps.characterStore,
    presetStore: deps.presetStore,
    useDialogFocus: deps.useDialogFocus,
    useGeminiCatalog: deps.useGeminiCatalog,
    Icon: deps.Icon,
    LoadingIndicator: deps.LoadingIndicator,
    SearchableSelect: deps.SearchableSelect,
    ToggleSwitch: deps.ToggleSwitch,
    TextInput: deps.TextInput,
    TextArea: deps.TextArea,
    CollapsibleSection: deps.CollapsibleSection,
    ModelTestButton: deps.ModelTestButton,
    buildSavedProbeTarget: deps.buildSavedProbeTarget,
    testModel: deps.testModel,
    connections: deps.connections,
    proxyPersistence: deps.proxyPersistence,
    createDefaultRpgDatabase: deps.createDefaultRpgDatabase,
    buildGeneratedLorebookEntries: deps.buildGeneratedLorebookEntries,
    parseLooseJson: deps.parseLooseJson,
    isProxyForToolsEnabled: deps.isProxyForToolsEnabled,
    defaultMythicSystemPrompt: deps.defaultMythicSystemPrompt,
    mythicPromptMacros: deps.mythicPromptMacros,
    importLegacyRpgDatabase: deps.importLegacyRpgDatabase,
    defaultGeminiModels: deps.defaultGeminiModels,
    getProxyUrl: deps.getProxyUrl,
    getProxyPassword: deps.getProxyPassword,
    getProxyLegacyMode: deps.getProxyLegacyMode,
    MythicConfigurationDialog: deps.MythicConfigurationDialog,
    RpgDatabaseEditor: deps.RpgDatabaseEditor,
    markdownParser: deps.markdownParser,
    htmlSanitizer: deps.htmlSanitizer,
    ActionProposal: deps.ActionProposal,
    defaultCopilotSystemPrompt: deps.defaultCopilotSystemPrompt,
    GoogleGenAIClient: deps.GoogleGenAIClient,
    getGeminiApiKey: deps.getGeminiApiKey,
    VariableTree: deps.VariableTree,
    RpgCellEditor: deps.RpgCellEditor,
    RpgTableRow: deps.RpgTableRow,
    RpgImportDialog: deps.RpgImportDialog,
    RpgTableEditor: deps.RpgTableEditor,
  };
}

function downloadJsonFile(payload, fileName) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
}

function getProposalAccentClass(toolName) {
  switch (toolName) {
    case 'add_prompt':
      return 'text-green-400';
    case 'move_prompt':
      return 'text-blue-400';
    case 'toggle_prompt':
      return 'text-amber-400';
    case 'edit_prompt':
      return 'text-fuchsia-400';
    case 'update_variable':
      return 'text-rose-400';
    case 'rewrite_last_turn':
      return 'text-cyan-400';
    default:
      return 'text-indigo-300';
  }
}

function getProposalDisplayTitle(toolName) {
  switch (toolName) {
    case 'add_prompt':
      return 'Thêm Lời Nhắc Mới';
    case 'move_prompt':
      return 'Di Chuyển Lời Nhắc';
    case 'toggle_prompt':
      return 'Bật/Tắt Lời Nhắc';
    case 'edit_prompt':
      return 'Chỉnh Sửa Nội Dung';
    case 'update_author_note':
      return 'Sửa Ghi Chú Tác Giả';
    case 'add_lore':
      return 'Thêm World Info';
    case 'update_variable':
      return 'Cập Nhật Biến Số';
    case 'rewrite_last_turn':
      return 'Viết Lại Phản Hồi';
    default:
      return 'Hành Động';
  }
}

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
    } = resolveRpgDependencies(getDependencies);

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
                  jsxRuntime.jsx('span', { children: '🛠️' }),
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

export function createMythicConfigurationDialog(getDependencies) {
  return function MythicConfigurationDialog({
    isOpen,
    onClose,
    database,
    onSave,
    lorebookEntries = [],
  }) {
    const {
      parseLooseJson,
      SearchableSelect,
      isProxyForToolsEnabled,
      defaultMythicSystemPrompt,
      ModelTestButton,
      mythicPromptMacros,
      importLegacyRpgDatabase,
      defaultGeminiModels,
      useDialogFocus,
      connections,
      proxyPersistence,
      getProxyLegacyMode,
      react,
      buildSavedProbeTarget,
      TextInput,
      useToast,
      useGeminiCatalog,
      testModel,
      getProxyUrl,
      jsxRuntime,
      getProxyPassword,
      ToggleSwitch,
    } = resolveRpgDependencies(getDependencies);

    const notify = useToast ? useToast().showToast : undefined;
    const [activeTab, setActiveTab] = react.useState('operation');
    const [draftSettings, setDraftSettings] = react.useState({
      triggerMode: 'auto',
      executionMode: 'standalone',
      modelId: '',
      customSystemPrompt: defaultMythicSystemPrompt,
      pinnedLorebookUids: [],
    });
    const [importJsonText, setImportJsonText] = react.useState('');
    const [importMode, setImportMode] = react.useState('merge');
    const { models: geminiModels } = useGeminiCatalog(defaultGeminiModels);

    const promptTextareaRef = react.useRef(null);
    const fileInputRef = react.useRef(null);
    const dialogRef = react.useRef(null);
    const closeButtonRef = react.useRef(null);

    useDialogFocus(isOpen, onClose, dialogRef, closeButtonRef);

    react.useEffect(() => {
      if (!isOpen) return;
      setDraftSettings({
        triggerMode: database.settings?.triggerMode || 'auto',
        executionMode: database.settings?.executionMode || 'standalone',
        modelId: database.settings?.modelId || '',
        customSystemPrompt: database.settings?.customSystemPrompt || defaultMythicSystemPrompt,
        triggerKeywords: database.settings?.triggerKeywords || [],
        pinnedLorebookUids: database.settings?.pinnedLorebookUids || [],
      });
      setImportJsonText('');
      setImportMode('merge');
    }, [isOpen, database]);

    const handleExportDatabase = exportMode => {
      const clonedDatabase = JSON.parse(JSON.stringify(database));
      if (exportMode === 'schema') {
        clonedDatabase.tables.forEach(table => {
          table.data = { rows: [] };
        });
        clonedDatabase.lastUpdated = Date.now();
      }
      downloadJsonFile(clonedDatabase, `MythicRPG_${exportMode}_${Date.now()}.json`);
    };

    const mergeImportedTables = importedDatabase => {
      const nextDatabase = { ...database };
      const mergedTables = [...nextDatabase.tables];
      importedDatabase.tables.forEach(incomingTable => {
        const existingIndex = mergedTables.findIndex(table => table.config.id === incomingTable.config.id);
        if (existingIndex === -1) {
          mergedTables.push(incomingTable);
        } else {
          mergedTables[existingIndex] = incomingTable;
        }
      });
      nextDatabase.tables = mergedTables;
      nextDatabase.lastUpdated = Date.now();
      onSave(nextDatabase);
    };

    const handleInsertMacro = macroLabel => {
      if (!promptTextareaRef.current) return;
      const start = promptTextareaRef.current.selectionStart;
      const end = promptTextareaRef.current.selectionEnd;
      const currentPrompt = draftSettings.customSystemPrompt || '';
      const nextPrompt = currentPrompt.substring(0, start) + macroLabel + currentPrompt.substring(end);
      setDraftSettings({ ...draftSettings, customSystemPrompt: nextPrompt });
      setTimeout(() => {
        promptTextareaRef.current?.focus();
        promptTextareaRef.current?.setSelectionRange(start + macroLabel.length, start + macroLabel.length);
      }, 0);
    };

    const handleTogglePinnedUid = uid => {
      const currentPinned = draftSettings.pinnedLorebookUids || [];
      if (currentPinned.includes(uid)) {
        setDraftSettings({
          ...draftSettings,
          pinnedLorebookUids: currentPinned.filter(item => item !== uid),
        });
      } else {
        setDraftSettings({
          ...draftSettings,
          pinnedLorebookUids: [...currentPinned, uid],
        });
      }
    };

    const handleFileImportChange = event => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = loadEvent => {
        try {
          let parsed = JSON.parse(loadEvent.target?.result);
          if (parsed.template && typeof parsed.template === 'object') {
            console.log("Detected Composite Config. Extracting 'template' part for import.");
            parsed = parsed.template;
          }
          let normalizedDatabase;
          if (parsed.tables && Array.isArray(parsed.tables)) {
            normalizedDatabase = parsed;
          } else {
            try {
              normalizedDatabase = importLegacyRpgDatabase(parsed);
            } catch {
              throw new Error('Không nhận diện được định dạng file.');
            }
          }
          if (importMode === 'overwrite') {
            normalizedDatabase.lastUpdated = Date.now();
            onSave(normalizedDatabase);
          } else {
            mergeImportedTables(normalizedDatabase);
          }
          onClose();
        } catch (error) {
          alert(`Lỗi nhập file: ${error instanceof Error ? error.message : String(error)}`);
        }
      };
      reader.readAsText(file);
    };

    const handleTextImport = () => {
      if (!importJsonText.trim()) return;
      try {
        let parsed = parseLooseJson(importJsonText);
        if (parsed.template && typeof parsed.template === 'object') {
          console.log("Detected Composite Config. Extracting 'template' part for import.");
          parsed = parsed.template;
        }
        let importedTables = [];
        if (parsed.tables && Array.isArray(parsed.tables)) {
          importedTables = parsed.tables;
        } else if (parsed.config && parsed.config.id) {
          importedTables = [{ config: parsed.config, data: parsed.data || { rows: [] } }];
        } else {
          try {
            importedTables = importLegacyRpgDatabase(parsed).tables;
          } catch {
            throw new Error('Không nhận diện được cấu trúc JSON.');
          }
        }

        if (importMode === 'overwrite') {
          onSave({
            version: 2,
            tables: importedTables,
            globalRules: parsed.globalRules || 'Hệ thống RPG Tự động.',
            settings: parsed.settings,
            lastUpdated: Date.now(),
          });
          alert(`Đã ghi đè dữ liệu thành công (${importedTables.length} bảng).`);
        } else {
          mergeImportedTables({
            version: 2,
            tables: importedTables,
            lastUpdated: Date.now(),
          });
          alert(`Đã gộp thành công ${importedTables.length} bảng dữ liệu!`);
        }
        setImportJsonText('');
      } catch (error) {
        alert(`Lỗi nhập văn bản: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    const renderModelTestButton = () => {
      if (!ModelTestButton || !buildSavedProbeTarget || !testModel) {
        return undefined;
      }
      const connectionSettings = connections?.getSettings?.() || {};
      const usesProxy = connectionSettings.source === 'proxy' || Boolean(isProxyForToolsEnabled?.());
      const resolvedModel = draftSettings.modelId
        || (usesProxy
          ? connectionSettings.proxy_tool_model || connectionSettings.proxy_model || ''
          : connectionSettings.gemini_model || '');
      return jsxRuntime.jsx(ModelTestButton, {
        target: buildSavedProbeTarget({
          provider: usesProxy ? 'proxy' : 'gemini',
          model: resolvedModel,
          connections,
          proxyPersistence,
          ...(getProxyUrl
            ? {
                proxy: {
                  url: getProxyUrl(),
                  password: getProxyPassword?.() || '',
                  legacyMode: getProxyLegacyMode ? getProxyLegacyMode() : true,
                  protocol: connectionSettings.proxy_protocol || 'openai',
                },
              }
            : {}),
        }),
        testModel,
        notify,
      });
    };

    if (!isOpen) return null;

    return jsxRuntime.jsx('div', {
      className: 'fixed inset-0 bg-black/80  flex items-center justify-center z-[130] p-4',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'mythic-config-title',
      children: jsxRuntime.jsxs('div', {
        ref: dialogRef,
        className: 'bg-slate-900 border border-slate-600 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden ',
        children: [
          jsxRuntime.jsxs('div', {
            className: 'p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800',
            children: [
              jsxRuntime.jsxs('h2', {
                id: 'mythic-config-title',
                className: 'text-xl font-bold text-sky-400 flex items-center gap-2',
                children: [
                  jsxRuntime.jsx('span', { children: '⚙️' }),
                  ' Cấu hình Mythic Engine',
                ],
              }),
              jsxRuntime.jsx('button', {
                ref: closeButtonRef,
                onClick: onClose,
                className: 'p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded ',
                'aria-label': 'Đóng cấu hình',
                children: jsxRuntime.jsx('svg', {
                  'aria-hidden': 'true',
                  xmlns: 'http://www.w3.org/2000/svg',
                  className: 'h-6 w-6',
                  fill: 'none',
                  viewBox: '0 0 24 24',
                  stroke: 'currentColor',
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
          jsxRuntime.jsxs('div', {
            className: 'flex border-b border-slate-700 bg-slate-900',
            children: [
              jsxRuntime.jsx('button', {
                onClick: () => setActiveTab('operation'),
                className: `flex-1 py-3 text-sm font-bold uppercase  ${
                  activeTab === 'operation'
                    ? 'text-sky-400 border-b-2 border-sky-400 bg-slate-800/50'
                    : 'text-slate-500 hover:text-slate-300'
                }`,
                children: 'Vận hành',
              }),
              jsxRuntime.jsx('button', {
                onClick: () => setActiveTab('prompt'),
                className: `flex-1 py-3 text-sm font-bold uppercase  ${
                  activeTab === 'prompt'
                    ? 'text-indigo-400 border-b-2 border-indigo-400 bg-slate-800/50'
                    : 'text-slate-500 hover:text-slate-300'
                }`,
                children: 'Lời nhắc (Prompt)',
              }),
              jsxRuntime.jsx('button', {
                onClick: () => setActiveTab('context'),
                className: `flex-1 py-3 text-sm font-bold uppercase  ${
                  activeTab === 'context'
                    ? 'text-fuchsia-400 border-b-2 border-fuchsia-400 bg-slate-800/50'
                    : 'text-slate-500 hover:text-slate-300'
                }`,
                children: 'Ngữ cảnh (Context)',
              }),
              jsxRuntime.jsx('button', {
                onClick: () => setActiveTab('data'),
                className: `flex-1 py-3 text-sm font-bold uppercase  ${
                  activeTab === 'data'
                    ? 'text-emerald-400 border-b-2 border-emerald-400 bg-slate-800/50'
                    : 'text-slate-500 hover:text-slate-300'
                }`,
                children: 'Dữ liệu (Data)',
              }),
            ],
          }),
          jsxRuntime.jsxs('div', {
            className: 'flex-grow p-6 overflow-y-auto custom-scrollbar bg-slate-900/50',
            children: [
              activeTab === 'operation' && jsxRuntime.jsxs('div', {
                className: 'space-y-6',
                children: [
                  jsxRuntime.jsxs('div', {
                    className: 'bg-slate-800/50 p-5 rounded-lg border border-slate-700',
                    children: [
                      jsxRuntime.jsx(SearchableSelect, {
                        label: '1. Chiến lược Thực thi (Execution Strategy)',
                        value: draftSettings.executionMode || 'standalone',
                        onChange: event => setDraftSettings({
                          ...draftSettings,
                          executionMode: event.target.value,
                        }),
                        options: [
                          { value: 'standalone', label: '🛡️ 2-Pass (Tách biệt - An toàn)' },
                          { value: 'integrated', label: '⚡ 1-Pass (Tích hợp - Tốc độ)' },
                        ],
                      }),
                      jsxRuntime.jsx('div', {
                        className: 'mt-2 text-xs text-slate-400 bg-slate-900/50 p-2 rounded',
                        children: draftSettings.executionMode === 'integrated'
                          ? jsxRuntime.jsxs('p', {
                              children: [
                                jsxRuntime.jsx('strong', { children: '1-Pass:' }),
                                ' Logic RPG được xử lý cùng lúc khi tạo hội thoại. Tốc độ nhanh nhất, tiết kiệm token, nhưng đôi khi AI có thể bỏ sót luật chơi.',
                              ],
                            })
                          : jsxRuntime.jsxs('p', {
                              children: [
                                jsxRuntime.jsx('strong', { children: '2-Pass:' }),
                                ' Logic RPG chạy riêng biệt sau khi hội thoại hoàn tất. Đảm bảo độ chính xác cao nhất và an toàn dữ liệu, nhưng tốn thêm thời gian xử lý.',
                              ],
                            }),
                      }),
                      draftSettings.executionMode === 'standalone' && jsxRuntime.jsx('div', {
                        className: 'mt-4 pt-4 border-t border-slate-700 ',
                        children: jsxRuntime.jsx(SearchableSelect, {
                          label: 'Model xử lý Logic (Chỉ cho 2-Pass)',
                          value: draftSettings.modelId || '',
                          onChange: event => setDraftSettings({
                            ...draftSettings,
                            modelId: event.target.value,
                          }),
                          options: [
                            { value: '', label: 'Sử dụng Model Chat mặc định' },
                            ...geminiModels.map(model => ({ value: model.id, label: model.name })),
                          ],
                          tooltip: 'Chọn model riêng cho Medusa. Khuyên dùng Gemini Flash hoặc Flash-Lite để tiết kiệm chi phí và tăng tốc độ.',
                          testButton: renderModelTestButton(),
                        }),
                      }),
                    ],
                  }),
                  jsxRuntime.jsxs('div', {
                    className: 'bg-slate-800/50 p-5 rounded-lg border border-slate-700',
                    children: [
                      jsxRuntime.jsx(SearchableSelect, {
                        label: '2. Chế độ Kích hoạt (Trigger Mode)',
                        value: draftSettings.triggerMode || 'auto',
                        onChange: event => setDraftSettings({
                          ...draftSettings,
                          triggerMode: event.target.value,
                        }),
                        options: [
                          { value: 'auto', label: '🔴 Tự động (Auto)' },
                          { value: 'keyword', label: '🟡 Từ khóa (Keyword)' },
                          { value: 'manual', label: '🔵 Thủ công (Manual)' },
                        ],
                      }),
                      jsxRuntime.jsxs('div', {
                        className: 'mt-2 text-xs text-slate-400 bg-slate-900/50 p-2 rounded',
                        children: [
                          draftSettings.triggerMode === 'auto' && jsxRuntime.jsx('p', {
                            children: 'Hệ thống tự động chạy sau mỗi lượt trả lời của AI.',
                          }),
                          draftSettings.triggerMode === 'keyword' && jsxRuntime.jsx('p', {
                            children: 'Chỉ chạy khi trong tin nhắn (User/AI) xuất hiện từ khóa quy định.',
                          }),
                          draftSettings.triggerMode === 'manual' && jsxRuntime.jsx('p', {
                            children: 'Chỉ chạy khi bạn bấm nút "Force Run" trong công cụ.',
                          }),
                        ],
                      }),
                      draftSettings.triggerMode === 'keyword' && jsxRuntime.jsx('div', {
                        className: 'mt-4 pt-4 border-t border-slate-700 ',
                        children: jsxRuntime.jsx(TextInput, {
                          label: 'Danh sách từ khóa (phân tách bằng dấu phẩy)',
                          value: (draftSettings.triggerKeywords || []).join(', '),
                          onChange: event => setDraftSettings({
                            ...draftSettings,
                            triggerKeywords: event.target.value.split(',').map(item => item.trim()).filter(Boolean),
                          }),
                          placeholder: 'ví dụ: /buy, [CHECK], inventory',
                        }),
                      }),
                    ],
                  }),
                ],
              }),
              activeTab === 'prompt' && jsxRuntime.jsxs('div', {
                className: 'flex flex-col h-full gap-4',
                children: [
                  jsxRuntime.jsxs('div', {
                    className: 'bg-indigo-900/20 p-3 rounded border border-indigo-500/30 text-xs text-indigo-200',
                    children: [
                      jsxRuntime.jsx('strong', {
                        className: 'block mb-1',
                        children: 'Thiết kế tính cách Game Master (Medusa)',
                      }),
                      'Bạn có thể sửa đổi prompt dưới đây để biến Medusa thành một Shopkeeper khó tính, một vị thần hào phóng, hoặc đơn giản là một hệ thống logic lạnh lùng.',
                    ],
                  }),
                  jsxRuntime.jsxs('div', {
                    className: 'flex gap-2 flex-wrap',
                    children: [
                      mythicPromptMacros.map(macro => jsxRuntime.jsx('button', {
                        onClick: () => handleInsertMacro(macro.label),
                        className: 'px-2 py-1 bg-slate-700 hover:bg-slate-600 text-xs font-mono rounded border border-slate-600 text-sky-300',
                        title: macro.desc,
                        children: macro.label,
                      }, macro.label)),
                      jsxRuntime.jsx('button', {
                        onClick: () => setDraftSettings({
                          ...draftSettings,
                          customSystemPrompt: defaultMythicSystemPrompt,
                        }),
                        className: 'px-2 py-1 bg-red-900/30 text-red-400 text-xs rounded hover:bg-red-900/50 ml-auto',
                        children: 'Khôi phục Mặc định',
                      }),
                    ],
                  }),
                  jsxRuntime.jsx('textarea', {
                    ref: promptTextareaRef,
                    value: draftSettings.customSystemPrompt,
                    'aria-label': 'Lời nhắc hệ thống Mythic Engine',
                    onChange: event => setDraftSettings({
                      ...draftSettings,
                      customSystemPrompt: event.target.value,
                    }),
                    className: 'flex-grow w-full bg-slate-800 border border-slate-600 rounded-lg p-4 font-mono text-sm text-slate-300 focus:ring-2 focus:ring-indigo-500 resize-none',
                  }),
                ],
              }),
              activeTab === 'context' && jsxRuntime.jsxs('div', {
                className: 'space-y-4',
                children: [
                  jsxRuntime.jsxs('div', {
                    className: 'bg-fuchsia-900/20 border border-fuchsia-500/30 p-4 rounded-lg',
                    children: [
                      jsxRuntime.jsx('h4', {
                        className: 'font-bold text-fuchsia-300 mb-1',
                        children: 'Cấu hình Ngữ cảnh Lai (Hybrid Context)',
                      }),
                      jsxRuntime.jsxs('p', {
                        className: 'text-sm text-slate-300',
                        children: [
                          'Ngoài các mục được hệ thống Chat tự động quét (Scan), bạn có thể chọn thủ công các mục Sổ tay quan trọng bên dưới để ',
                          jsxRuntime.jsx('strong', { children: 'luôn luôn gửi' }),
                          ' cho Medusa (ví dụ: Luật chơi, Định nghĩa chỉ số).',
                        ],
                      }),
                    ],
                  }),
                  jsxRuntime.jsx('div', {
                    className: 'space-y-2',
                    children: lorebookEntries.length === 0
                      ? jsxRuntime.jsx('p', {
                          className: 'text-center text-slate-500 py-4 italic',
                          children: 'Không tìm thấy mục Sổ tay nào.',
                        })
                      : lorebookEntries.map((entry, index) => {
                          const entryUid = entry.uid || `entry_${index}`;
                          const isPinned = (draftSettings.pinnedLorebookUids || []).includes(entryUid);
                          return jsxRuntime.jsxs('div', {
                            className: `flex items-center justify-between p-3 rounded-lg border  ${
                              isPinned
                                ? 'bg-fuchsia-900/20 border-fuchsia-500/50'
                                : 'bg-slate-800/50 border-slate-700 hover:border-slate-500'
                            }`,
                            children: [
                              jsxRuntime.jsxs('div', {
                                className: 'flex-grow min-w-0 pr-4',
                                children: [
                                  jsxRuntime.jsxs('div', {
                                    className: 'flex items-center gap-2',
                                    children: [
                                      jsxRuntime.jsx('h5', {
                                        className: `font-bold text-sm truncate ${isPinned ? 'text-fuchsia-300' : 'text-slate-300'}`,
                                        children: entry.comment || `Mục không tên #${index + 1}`,
                                      }),
                                      entry.constant && jsxRuntime.jsx('span', {
                                        className: 'text-[10px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded border border-slate-600',
                                        children: 'Constant',
                                      }),
                                    ],
                                  }),
                                  jsxRuntime.jsx('p', {
                                    className: 'text-xs text-slate-500 font-mono mt-1 line-clamp-1',
                                    children: entry.content,
                                  }),
                                ],
                              }),
                              jsxRuntime.jsx(ToggleSwitch, {
                                checked: isPinned,
                                onChange: () => handleTogglePinnedUid(entryUid),
                                label: 'Gửi cho Medusa',
                                clean: true,
                              }),
                            ],
                          }, entryUid);
                        }),
                  }),
                ],
              }),
              activeTab === 'data' && jsxRuntime.jsxs('div', {
                className: 'flex flex-col gap-8 h-full',
                children: [
                  jsxRuntime.jsxs('div', {
                    className: 'grid grid-cols-1 md:grid-cols-2 gap-8',
                    children: [
                      jsxRuntime.jsxs('div', {
                        className: 'bg-slate-800/50 border border-slate-700 p-6 rounded-xl text-center flex flex-col justify-center hover:border-emerald-500/50 ',
                        children: [
                          jsxRuntime.jsx('div', { className: 'text-4xl mb-4', children: '📤' }),
                          jsxRuntime.jsx('h3', {
                            className: 'text-lg font-bold text-emerald-400 mb-2',
                            children: 'Xuất Dữ liệu (File)',
                          }),
                          jsxRuntime.jsx('p', {
                            className: 'text-sm text-slate-400 mb-6',
                            children: 'Lưu trữ hoặc chia sẻ hệ thống RPG.',
                          }),
                          jsxRuntime.jsxs('div', {
                            className: 'space-y-3',
                            children: [
                              jsxRuntime.jsx('button', {
                                onClick: () => handleExportDatabase('full'),
                                className: 'w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-lg',
                                children: 'Xuất Trọn gói (Full Save)',
                              }),
                              jsxRuntime.jsx('button', {
                                onClick: () => handleExportDatabase('schema'),
                                className: 'w-full py-3 bg-slate-700 hover:bg-slate-600 text-emerald-300 font-bold rounded-lg border border-slate-600',
                                children: 'Chỉ Xuất Cấu trúc',
                              }),
                            ],
                          }),
                        ],
                      }),
                      jsxRuntime.jsxs('div', {
                        className: 'bg-slate-800/50 border border-slate-700 p-6 rounded-xl text-center flex flex-col justify-center hover:border-sky-500/50 ',
                        children: [
                          jsxRuntime.jsx('div', { className: 'text-4xl mb-4', children: '📥' }),
                          jsxRuntime.jsx('h3', {
                            className: 'text-lg font-bold text-sky-400 mb-2',
                            children: 'Nhập Dữ liệu (File)',
                          }),
                          jsxRuntime.jsxs('div', {
                            className: 'flex justify-center gap-4 mb-4',
                            children: [
                              jsxRuntime.jsxs('label', {
                                className: 'flex items-center gap-2 cursor-pointer text-sm text-slate-300 hover:text-white',
                                children: [
                                  jsxRuntime.jsx('input', {
                                    type: 'radio',
                                    name: 'mythic-file-import-mode',
                                    'aria-label': 'Gộp dữ liệu từ file',
                                    checked: importMode === 'merge',
                                    onChange: () => setImportMode('merge'),
                                    className: 'accent-sky-500',
                                  }),
                                  jsxRuntime.jsx('span', { children: 'Gộp (Merge)' }),
                                ],
                              }),
                              jsxRuntime.jsxs('label', {
                                className: 'flex items-center gap-2 cursor-pointer text-sm text-slate-300 hover:text-white',
                                children: [
                                  jsxRuntime.jsx('input', {
                                    type: 'radio',
                                    name: 'mythic-file-import-mode',
                                    'aria-label': 'Ghi đè dữ liệu từ file',
                                    checked: importMode === 'overwrite',
                                    onChange: () => setImportMode('overwrite'),
                                    className: 'accent-red-500',
                                  }),
                                  jsxRuntime.jsx('span', {
                                    className: importMode === 'overwrite' ? 'text-red-400' : '',
                                    children: 'Ghi đè (Overwrite)',
                                  }),
                                ],
                              }),
                            ],
                          }),
                          jsxRuntime.jsx('p', {
                            className: 'text-xs text-slate-500 mb-6',
                            children: importMode === 'merge'
                              ? 'Giữ dữ liệu cũ, thêm dữ liệu mới.'
                              : 'Xóa toàn bộ dữ liệu cũ và thay thế bằng dữ liệu mới.',
                          }),
                          jsxRuntime.jsx('input', {
                            type: 'file',
                            'aria-label': 'Nhập dữ liệu JSON',
                            ref: fileInputRef,
                            className: 'hidden',
                            accept: '.json',
                            onChange: handleFileImportChange,
                          }),
                          jsxRuntime.jsxs('button', {
                            onClick: () => fileInputRef.current?.click(),
                            className: 'w-full py-8 border-2 border-dashed border-slate-600 hover:border-sky-500 rounded-xl text-slate-400 hover:text-sky-400  flex flex-col items-center justify-center gap-2',
                            children: [
                              jsxRuntime.jsx('svg', {
                                'aria-hidden': 'true',
                                xmlns: 'http://www.w3.org/2000/svg',
                                className: 'h-8 w-8',
                                fill: 'none',
                                viewBox: '0 0 24 24',
                                stroke: 'currentColor',
                                children: jsxRuntime.jsx('path', {
                                  strokeLinecap: 'round',
                                  strokeLinejoin: 'round',
                                  strokeWidth: '2',
                                  d: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
                                }),
                              }),
                              jsxRuntime.jsx('span', { children: 'Chọn file JSON để tải lên' }),
                            ],
                          }),
                        ],
                      }),
                    ],
                  }),
                  jsxRuntime.jsxs('div', {
                    className: 'bg-slate-800/50 border border-slate-700 p-4 rounded-xl',
                    children: [
                      jsxRuntime.jsxs('div', {
                        className: 'flex items-center gap-2 mb-3',
                        children: [
                          jsxRuntime.jsx('span', { className: 'text-xl', children: '📋' }),
                          jsxRuntime.jsx('h3', {
                            className: 'text-lg font-bold text-indigo-400',
                            children: 'Nhập nhanh từ văn bản (JSON)',
                          }),
                        ],
                      }),
                      jsxRuntime.jsxs('div', {
                        className: 'space-y-3',
                        children: [
                          jsxRuntime.jsx('textarea', {
                            value: importJsonText,
                            'aria-label': 'Dữ liệu JSON để nhập',
                            onChange: event => setImportJsonText(event.target.value),
                            placeholder: 'Dán mã JSON (Database đầy đủ hoặc Bảng đơn lẻ) vào đây...',
                            rows: 4,
                            className: 'w-full bg-slate-900 border border-slate-600 rounded-lg p-3 font-mono text-xs text-slate-300 focus:ring-2 focus:ring-indigo-500',
                          }),
                          jsxRuntime.jsxs('div', {
                            className: 'flex justify-between items-center',
                            children: [
                              jsxRuntime.jsxs('div', {
                                className: 'flex items-center gap-4',
                                children: [
                                  jsxRuntime.jsx('p', {
                                    className: 'text-xs text-slate-500 italic',
                                    children: 'Hỗ trợ JSON lỏng lẻo.',
                                  }),
                                  jsxRuntime.jsxs('div', {
                                    className: 'flex gap-2',
                                    children: [
                                      jsxRuntime.jsxs('label', {
                                        className: 'flex items-center gap-1 cursor-pointer text-xs text-slate-400',
                                        children: [
                                          jsxRuntime.jsx('input', {
                                            type: 'radio',
                                            name: 'mythic-text-import-mode',
                                            'aria-label': 'Gộp dữ liệu từ văn bản',
                                            checked: importMode === 'merge',
                                            onChange: () => setImportMode('merge'),
                                            className: 'accent-indigo-500',
                                          }),
                                          ' Merge',
                                        ],
                                      }),
                                      jsxRuntime.jsxs('label', {
                                        className: 'flex items-center gap-1 cursor-pointer text-xs text-slate-400',
                                        children: [
                                          jsxRuntime.jsx('input', {
                                            type: 'radio',
                                            name: 'mythic-text-import-mode',
                                            'aria-label': 'Ghi đè dữ liệu từ văn bản',
                                            checked: importMode === 'overwrite',
                                            onChange: () => setImportMode('overwrite'),
                                            className: 'accent-red-500',
                                          }),
                                          ' Overwrite',
                                        ],
                                      }),
                                    ],
                                  }),
                                ],
                              }),
                              jsxRuntime.jsx('button', {
                                onClick: handleTextImport,
                                disabled: !importJsonText.trim(),
                                className: 'px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow disabled:opacity-50 disabled:cursor-not-allowed ',
                                children: 'Nhập Ngay',
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
          }),
          jsxRuntime.jsxs('div', {
            className: 'p-4 border-t border-slate-700 bg-slate-800 flex justify-end gap-3',
            children: [
              jsxRuntime.jsx('button', {
                onClick: onClose,
                className: 'px-4 py-2 text-sm font-bold rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300',
                children: 'Hủy bỏ',
              }),
              jsxRuntime.jsx('button', {
                onClick: () => {
                  onSave({ ...database, settings: draftSettings });
                  onClose();
                },
                className: 'px-6 py-2 text-sm font-bold rounded-lg bg-sky-600 hover:bg-sky-500 text-white shadow-lg',
                children: 'Lưu Cấu hình',
              }),
            ],
          }),
        ],
      }),
    });
  };
}

export function createCharacterRpgSection(getDependencies) {
  return function CharacterRpgSection({ card, onUpdate }) {
    const {
      createDefaultRpgDatabase,
      MythicConfigurationDialog,
      RpgDatabaseEditor,
      react,
      CollapsibleSection,
      jsxRuntime,
      ToggleSwitch,
    } = resolveRpgDependencies(getDependencies);

    const [isSchemaEditorOpen, setIsSchemaEditorOpen] = react.useState(false);
    const [isConfigDialogOpen, setIsConfigDialogOpen] = react.useState(false);

    const rpgDatabase = card.rpg_data;
    const isEnabled = Boolean(rpgDatabase);
    const tableCount = rpgDatabase?.tables?.length || 0;
    const liveLinkCount = rpgDatabase?.tables?.filter(table => table.config.lorebookLink?.enabled).length || 0;
    const statusText = isEnabled
      ? `🟢 Mythic Engine: ${(rpgDatabase?.settings?.executionMode || 'standalone') === 'integrated' ? '1-Pass' : '2-Pass'} • ${tableCount} Bảng • ${liveLinkCount} Live-Link`
      : '⚪ Mythic Engine: Off';

    const handleSaveRpgData = nextDatabase => {
      onUpdate({ ...card, rpg_data: nextDatabase });
    };

    const handleToggleMythic = enabled => {
      if (enabled) {
        if (!rpgDatabase) {
          onUpdate({ ...card, rpg_data: createDefaultRpgDatabase() });
        }
      } else {
        const nextCard = { ...card };
        delete nextCard.rpg_data;
        onUpdate(nextCard);
      }
    };

    return jsxRuntime.jsxs(CollapsibleSection, {
      title: 'Hệ thống RPG (Mythic Engine)',
      defaultOpen: false,
      description: 'Cấu hình cơ sở dữ liệu và luật chơi cho nhân vật này.',
      children: [
        jsxRuntime.jsxs('div', {
          className: 'col-span-full space-y-4',
          children: [
            jsxRuntime.jsxs('div', {
              className: 'flex items-center justify-between bg-slate-700/30 p-4 rounded-lg border border-slate-600/50',
              children: [
                jsxRuntime.jsxs('div', {
                  children: [
                    jsxRuntime.jsx('h4', {
                      className: 'font-bold text-slate-200',
                      children: 'Kích hoạt Mythic Engine',
                    }),
                    jsxRuntime.jsx('p', {
                      className: 'text-xs text-slate-400 mt-1 font-mono',
                      children: statusText,
                    }),
                  ],
                }),
                jsxRuntime.jsxs('div', {
                  className: 'flex items-center gap-3',
                  children: [
                    isEnabled && jsxRuntime.jsx('button', {
                      onClick: () => setIsConfigDialogOpen(true),
                      className: 'p-2 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white ',
                      title: 'Cấu hình nâng cao',
                      children: jsxRuntime.jsx('svg', {
                        'aria-hidden': 'true',
                        xmlns: 'http://www.w3.org/2000/svg',
                        className: 'h-5 w-5',
                        viewBox: '0 0 20 20',
                        fill: 'currentColor',
                        children: jsxRuntime.jsx('path', {
                          fillRule: 'evenodd',
                          d: 'M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z',
                          clipRule: 'evenodd',
                        }),
                      }),
                    }),
                    jsxRuntime.jsx(ToggleSwitch, {
                      checked: isEnabled,
                      onChange: handleToggleMythic,
                      label: '',
                      ariaLabel: 'Kích hoạt Mythic Engine',
                      clean: true,
                    }),
                  ],
                }),
              ],
            }),
            isEnabled && rpgDatabase && jsxRuntime.jsxs('div', {
              className: '',
              children: [
                jsxRuntime.jsxs('button', {
                  onClick: () => setIsSchemaEditorOpen(true),
                  className: 'w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-lg shadow-indigo-500/20  flex flex-col items-center justify-center gap-2 border border-indigo-400/30',
                  children: [
                    jsxRuntime.jsx('span', { className: 'text-2xl', children: '🛠️' }),
                    jsxRuntime.jsx('span', { children: 'Mở Trình Thiết Kế Cấu Trúc (Schema Builder)' }),
                    jsxRuntime.jsx('span', {
                      className: 'text-xs font-normal opacity-80 text-indigo-200',
                      children: 'Chỉnh sửa bảng, cột và luật AI',
                    }),
                  ],
                }),
                jsxRuntime.jsx('div', {
                  className: 'mt-4 grid grid-cols-2 gap-4',
                  children: rpgDatabase.tables?.map(table => jsxRuntime.jsxs('div', {
                    className: 'bg-slate-800 p-3 rounded border border-slate-700 text-sm text-slate-300 flex justify-between',
                    children: [
                      jsxRuntime.jsx('span', { children: table.config.name }),
                      jsxRuntime.jsxs('span', {
                        className: 'text-xs text-slate-500',
                        children: [(table.config.columns || []).length, ' cột'],
                      }),
                    ],
                  }, table.config.id)),
                }),
              ],
            }),
          ],
        }),
        jsxRuntime.jsx(RpgDatabaseEditor, {
          isOpen: isSchemaEditorOpen,
          onClose: () => setIsSchemaEditorOpen(false),
          database: rpgDatabase,
          onSave: handleSaveRpgData,
        }),
        rpgDatabase && jsxRuntime.jsx(MythicConfigurationDialog, {
          isOpen: isConfigDialogOpen,
          onClose: () => setIsConfigDialogOpen(false),
          database: rpgDatabase,
          onSave: handleSaveRpgData,
          lorebookEntries: card.char_book?.entries || [],
        }),
      ],
    });
  };
}

export function createActionProposal(getDependencies) {
  return function ActionProposal({ proposal, onExecute }) {
    const { react, Icon, jsxRuntime } = resolveRpgDependencies(getDependencies);
    const [targetScope, setTargetScope] = react.useState('preset');
    const [isExecuted, setIsExecuted] = react.useState(false);

    const isDirectExecutionTool = proposal.tool === 'update_variable' || proposal.tool === 'rewrite_last_turn';

    if (isExecuted) {
      return jsxRuntime.jsxs('div', {
        className: 'mt-2 p-3 bg-green-900/30 border border-green-500/50 rounded-lg text-green-300 text-sm flex items-center gap-2',
        children: [
          jsxRuntime.jsx(Icon, { name: 'check', className: 'h-4 w-4' }),
          jsxRuntime.jsx('span', { children: 'Đã thực thi hành động thành công.' }),
        ],
      });
    }

    return jsxRuntime.jsxs('div', {
      className: 'mt-3 p-4 bg-slate-800 border border-indigo-500/50 rounded-xl shadow-lg ',
      children: [
        jsxRuntime.jsxs('div', {
          className: `flex items-center gap-2 mb-2 font-bold text-sm uppercase tracking-wide ${getProposalAccentClass(proposal.tool)}`,
          children: [
            jsxRuntime.jsx(Icon, { name: 'sparkles', className: 'h-4 w-4' }),
            'Đề xuất: ',
            getProposalDisplayTitle(proposal.tool),
          ],
        }),
        jsxRuntime.jsxs('p', {
          className: 'text-xs text-slate-400 mb-3 italic',
          children: ['"', proposal.reason, '"'],
        }),
        jsxRuntime.jsxs('div', {
          className: 'bg-slate-900/50 p-2 rounded border border-slate-700 mb-4 text-xs font-mono text-slate-300 max-h-48 overflow-y-auto custom-scrollbar',
          children: [
            proposal.tool === 'add_prompt' && jsxRuntime.jsxs(jsxRuntime.Fragment, {
              children: [
                jsxRuntime.jsxs('div', {
                  children: [
                    jsxRuntime.jsx('strong', { className: 'text-sky-400', children: 'Tên:' }),
                    ' ',
                    proposal.data.name,
                  ],
                }),
                jsxRuntime.jsxs('div', {
                  children: [
                    jsxRuntime.jsx('strong', { className: 'text-sky-400', children: 'Nội dung:' }),
                    ' ',
                    proposal.data.content,
                  ],
                }),
              ],
            }),
            proposal.tool === 'update_variable' && jsxRuntime.jsxs(jsxRuntime.Fragment, {
              children: [
                jsxRuntime.jsxs('div', {
                  children: [
                    jsxRuntime.jsx('strong', { className: 'text-sky-400', children: 'Biến số:' }),
                    ' ',
                    proposal.data.key,
                  ],
                }),
                jsxRuntime.jsxs('div', {
                  children: [
                    jsxRuntime.jsx('strong', { className: 'text-sky-400', children: 'Giá trị mới:' }),
                    ' ',
                    JSON.stringify(proposal.data.value),
                  ],
                }),
              ],
            }),
            proposal.tool === 'rewrite_last_turn' && jsxRuntime.jsxs(jsxRuntime.Fragment, {
              children: [
                jsxRuntime.jsx('div', { className: 'text-gray-400 mb-1', children: 'Nội dung viết lại:' }),
                jsxRuntime.jsx('div', {
                  className: 'pl-2 border-l-2 border-cyan-500/50',
                  children: proposal.data.content,
                }),
              ],
            }),
            proposal.tool === 'move_prompt' && jsxRuntime.jsxs(jsxRuntime.Fragment, {
              children: [
                jsxRuntime.jsxs('div', {
                  children: [
                    jsxRuntime.jsx('strong', { className: 'text-sky-400', children: 'Mục tiêu:' }),
                    ' ',
                    proposal.data.name,
                  ],
                }),
                jsxRuntime.jsxs('div', {
                  children: [
                    jsxRuntime.jsx('strong', { className: 'text-sky-400', children: 'Đến vị trí:' }),
                    ' ',
                    proposal.data.position === 'top'
                      ? 'Đầu danh sách'
                      : (proposal.data.position === 'bottom' ? 'Cuối danh sách' : `Vị trí #${proposal.data.position}`),
                  ],
                }),
              ],
            }),
            proposal.tool === 'toggle_prompt' && jsxRuntime.jsxs(jsxRuntime.Fragment, {
              children: [
                jsxRuntime.jsxs('div', {
                  children: [
                    jsxRuntime.jsx('strong', { className: 'text-sky-400', children: 'Mục tiêu:' }),
                    ' ',
                    proposal.data.name,
                  ],
                }),
                jsxRuntime.jsxs('div', {
                  children: [
                    jsxRuntime.jsx('strong', { className: 'text-sky-400', children: 'Trạng thái mới:' }),
                    ' ',
                    proposal.data.enabled ? 'BẬT (Enabled)' : 'TẮT (Disabled)',
                  ],
                }),
              ],
            }),
            proposal.tool === 'edit_prompt' && jsxRuntime.jsxs(jsxRuntime.Fragment, {
              children: [
                jsxRuntime.jsxs('div', {
                  children: [
                    jsxRuntime.jsx('strong', { className: 'text-sky-400', children: 'Mục tiêu:' }),
                    ' ',
                    proposal.data.name,
                  ],
                }),
                jsxRuntime.jsxs('div', {
                  className: 'mt-1 border-t border-slate-700 pt-1 text-green-300',
                  children: [
                    jsxRuntime.jsx('strong', { className: 'text-sky-400', children: 'Nội dung mới:' }),
                    ' ',
                    proposal.data.content,
                  ],
                }),
              ],
            }),
            proposal.tool === 'update_author_note' && jsxRuntime.jsxs('div', {
              children: [
                jsxRuntime.jsx('strong', { className: 'text-sky-400', children: 'Nội dung mới:' }),
                ' ',
                proposal.data.content,
              ],
            }),
            proposal.tool === 'add_lore' && jsxRuntime.jsxs(jsxRuntime.Fragment, {
              children: [
                jsxRuntime.jsxs('div', {
                  children: [
                    jsxRuntime.jsx('strong', { className: 'text-sky-400', children: 'Keys:' }),
                    ' ',
                    proposal.data.keys?.join(', '),
                  ],
                }),
                jsxRuntime.jsxs('div', {
                  children: [
                    jsxRuntime.jsx('strong', { className: 'text-sky-400', children: 'Content:' }),
                    ' ',
                    proposal.data.content,
                  ],
                }),
              ],
            }),
          ],
        }),
        jsxRuntime.jsxs('div', {
          className: 'space-y-3',
          children: [
            !isDirectExecutionTool && jsxRuntime.jsxs('div', {
              className: 'flex flex-col gap-1',
              children: [
                jsxRuntime.jsx('span', {
                  className: 'text-xs font-semibold text-slate-300',
                  children: 'Lưu thay đổi vào đâu?',
                }),
                jsxRuntime.jsxs('div', {
                  className: 'flex bg-slate-900 rounded-lg p-1 border border-slate-700',
                  children: [
                    jsxRuntime.jsx('button', {
                      onClick: () => setTargetScope('preset'),
                      className: `flex-1 py-1.5 px-3 rounded-md text-xs font-medium  ${
                        targetScope === 'preset' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                      }`,
                      children: 'Preset (Toàn cục)',
                    }),
                    jsxRuntime.jsx('button', {
                      onClick: () => setTargetScope('character'),
                      className: `flex-1 py-1.5 px-3 rounded-md text-xs font-medium  ${
                        targetScope === 'character' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'
                      }`,
                      children: 'Nhân vật (Cục bộ)',
                    }),
                  ],
                }),
              ],
            }),
            jsxRuntime.jsxs('button', {
              onClick: () => {
                onExecute(targetScope);
                setIsExecuted(true);
              },
              className: 'w-full py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-lg shadow-md  active:scale-95 text-sm flex items-center justify-center gap-2',
              children: [
                jsxRuntime.jsx('span', { children: '✅' }),
                ' ',
                isDirectExecutionTool ? 'Thực thi Ngay' : 'Áp dụng Thay đổi',
              ],
            }),
          ],
        }),
      ],
    });
  };
}

export function createActionSuggestionDialog(getDependencies) {
  return function ActionSuggestionDialog({
    isOpen,
    onClose,
    gameHistory,
    card,
    variables,
    logs,
    onUpdateVariable,
    onRewriteMessage,
  }) {
    const {
      markdownParser,
      ModelTestButton,
      ActionProposal,
      defaultCopilotSystemPrompt,
      defaultGeminiModels,
      htmlSanitizer,
      connections,
      proxyPersistence,
      react,
      presetStore,
      buildSavedProbeTarget,
      useToast,
      useGeminiCatalog,
      characterStore,
      Icon,
      LoadingIndicator,
      testModel,
      GoogleGenAIClient,
      jsxRuntime,
      getGeminiApiKey,
    } = resolveRpgDependencies(getDependencies);

    const { updateActiveCharacter, reloadCharacters } = characterStore();
    const { presets, activePresetName, updateActivePreset, reloadPresets } = presetStore();
    const { showToast } = useToast();
    const { models: geminiModels } = useGeminiCatalog(defaultGeminiModels);

    const [chatMessages, setChatMessages] = react.useState([{
      role: 'model',
      content: 'Xin chào! Tôi là Co-pilot. Tôi đã đọc xong Sổ tay nhân vật, Biến số và Lời nhắc hệ thống. Bạn cần tôi giải thích điều gì?',
    }]);
    const [inputText, setInputText] = react.useState('');
    const [isSending, setIsSending] = react.useState(false);
    const [selectedModel, setSelectedModel] = react.useState('gemini-3-flash-preview');
    const [isPromptSettingsOpen, setIsPromptSettingsOpen] = react.useState(false);
    const [systemPromptTemplate, setSystemPromptTemplate] = react.useState(defaultCopilotSystemPrompt);
    const scrollBottomRef = react.useRef(null);

    react.useEffect(() => {
      if (!isPromptSettingsOpen) {
        scrollBottomRef.current?.scrollIntoView({ behavior: 'auto', block: 'nearest' });
      }
    }, [chatMessages, isOpen, isPromptSettingsOpen]);

    const buildCopilotPrompt = userQuery => {
      const charBookText = card?.char_book?.entries
        ? card.char_book.entries
            .filter(entry => entry.enabled !== false)
            .map(entry => `[Mục: ${entry.comment || 'Không tên'}]\nKeys: ${entry.keys.join(', ')}\nNội dung: ${entry.content}`)
            .join('\n\n')
        : '(Không có Sổ tay)';

      const activePreset = presets.find(preset => preset.name === activePresetName);
      const promptStructureText = activePreset && activePreset.prompts
        ? activePreset.prompts.map((prompt, index) => `${index}. ${prompt.enabled ? '[BẬT]' : '[TẮT]'} "${prompt.name}"`).join('\n')
        : '(Không có cấu trúc Preset)';

      const lastOutgoingPromptText = logs.turns && logs.turns.length !== 0
        ? logs.turns[0].prompt.map(section => `--- ${section.name} ---\n${section.content}`).join('\n\n')
        : '(Chưa có lượt nào được ghi lại)';

      const roleplayHistoryText = gameHistory.slice(-15).map(message => {
        const speaker = message.role === 'user' ? 'User' : (card?.name || 'Char');
        let cleanText = message.content.replace(/<[^>]*>/g, '');
        if (cleanText.length > 500) {
          cleanText = `${cleanText.substring(0, 500)}...`;
        }
        return `${speaker}: ${cleanText}`;
      }).join('\n');

      const copilotHistoryText = chatMessages
        .slice(-10)
        .map(message => `${message.role.toUpperCase()}: ${message.content}`)
        .join('\n');

      return systemPromptTemplate
        .replace('{{char_book}}', charBookText)
        .replace('{{prompt_structure}}', promptStructureText)
        .replace('{{variables}}', JSON.stringify(variables, null, 2))
        .replace('{{last_outgoing_prompt}}', lastOutgoingPromptText)
        .replace('{{roleplay_history}}', roleplayHistoryText)
        .replace('{{chat_history}}', copilotHistoryText)
        .replace('{{char}}', card?.name || 'Character')
        .replace('{{user}}', 'User')
        .replace('{{user_query}}', userQuery);
    };

    const handleSendQuery = async () => {
      if (!inputText.trim() || isSending) return;
      const queryText = inputText;
      setChatMessages(previous => [...previous, { role: 'user', content: queryText }]);
      setInputText('');
      setIsSending(true);
      try {
        const apiKey = getGeminiApiKey();
        if (!apiKey) {
          throw new Error('Chưa có API Key.');
        }
        let parsedProposal;
        const client = new GoogleGenAIClient({ apiKey });
        const prompt = buildCopilotPrompt(queryText);
        const responseText = (await client.models.generateContent({
          model: selectedModel,
          contents: prompt,
        })).text || 'Xin lỗi, tôi không thể phản hồi lúc này.';

        let displayReply = responseText;
        const jsonFenceMatch = responseText.match(/```json\s*(\{[\s\S]*?\})\s*```/);
        if (jsonFenceMatch) {
          try {
            parsedProposal = JSON.parse(jsonFenceMatch[1]);
            displayReply = responseText.replace(jsonFenceMatch[0], '').trim();
          } catch {
            console.warn('Failed to parse Action JSON from AI response');
          }
        }
        setChatMessages(previous => [...previous, {
          role: 'model',
          content: displayReply,
          actionProposal: parsedProposal,
        }]);
      } catch (error) {
        setChatMessages(previous => [...previous, {
          role: 'model',
          content: `Lỗi: ${error instanceof Error ? error.message : String(error)}`,
        }]);
      } finally {
        setIsSending(false);
      }
    };

    const handleExecuteProposal = async (proposal, targetScope) => {
      if (proposal.tool === 'update_variable') {
        try {
          onUpdateVariable(proposal.data.key, proposal.data.value);
          showToast(`Đã cập nhật biến ${proposal.data.key} thành công.`, 'success');
        } catch (error) {
          showToast(`Lỗi cập nhật biến: ${error}`, 'error');
        }
        return;
      }

      if (proposal.tool === 'rewrite_last_turn') {
        try {
          const latestModelMessage = [...gameHistory].reverse().find(message => message.role === 'model');
          if (!latestModelMessage) {
            showToast('Không tìm thấy tin nhắn nào của AI để viết lại.', 'warning');
            return;
          }
          const rewritten = await onRewriteMessage(latestModelMessage.id, proposal.data.content);
          if (rewritten === false) {
            showToast('Hệ thống đang bận; chưa viết lại phản hồi.', 'warning');
          } else {
            showToast('Đã viết lại phản hồi mới nhất.', 'success');
          }
        } catch (error) {
          showToast(`Lỗi viết lại: ${error}`, 'error');
        }
        return;
      }

      if (!card) {
        showToast('Không tìm thấy thẻ nhân vật đang hoạt động.', 'error');
        return;
      }

      try {
        if (targetScope === 'preset') {
          const activePreset = presets.find(preset => preset.name === activePresetName);
          if (!activePreset) {
            throw new Error('Không tìm thấy Preset đang hoạt động.');
          }
          const clonedPreset = JSON.parse(JSON.stringify(activePreset));
          clonedPreset.prompts ||= [];

          if (proposal.tool === 'add_prompt') {
            clonedPreset.prompts.push({ ...proposal.data, identifier: `auto_${Date.now()}` });
          } else if (proposal.tool === 'move_prompt') {
            const targetIndex = clonedPreset.prompts.findIndex(item => item.name === proposal.data.name);
            if (targetIndex !== -1) {
              const [moved] = clonedPreset.prompts.splice(targetIndex, 1);
              let insertIndex = 0;
              if (proposal.data.position === 'top') {
                insertIndex = 0;
              } else if (proposal.data.position === 'bottom') {
                insertIndex = clonedPreset.prompts.length;
              } else {
                insertIndex = Math.min(Math.max(0, Number.parseInt(proposal.data.position, 10)), clonedPreset.prompts.length);
              }
              clonedPreset.prompts.splice(insertIndex, 0, moved);
            }
          } else if (proposal.tool === 'toggle_prompt') {
            const targetIndex = clonedPreset.prompts.findIndex(item => item.name === proposal.data.name);
            if (targetIndex !== -1) {
              clonedPreset.prompts[targetIndex].enabled = proposal.data.enabled;
            }
          } else if (proposal.tool === 'edit_prompt') {
            const targetIndex = clonedPreset.prompts.findIndex(item => item.name === proposal.data.name);
            if (targetIndex !== -1) {
              clonedPreset.prompts[targetIndex].content = proposal.data.content;
            }
          } else if (proposal.tool === 'update_author_note') {
            clonedPreset.prompts.push({
              name: 'Author Note (AI Added)',
              content: proposal.data.content,
              role: 'system',
              enabled: true,
              identifier: `an_${Date.now()}`,
            });
          } else if (proposal.tool === 'add_lore') {
            clonedPreset.prompts.push({
              name: `Lore: ${proposal.data.keys?.[0] || 'New Info'}`,
              content: `${proposal.data.keys?.join(', ')}: ${proposal.data.content}`,
              role: 'system',
              enabled: true,
              identifier: `lore_${Date.now()}`,
            });
          }

          await updateActivePreset(clonedPreset);
          showToast('Đã cập nhật Preset thành công!', 'success');
          await reloadPresets();
        } else if (targetScope === 'character') {
          const clonedCard = JSON.parse(JSON.stringify(card));
          if (proposal.tool === 'add_prompt') {
            clonedCard.system_prompt = `${clonedCard.system_prompt || ''}\n\n[${proposal.data.name}]\n${proposal.data.content}`;
          } else if (proposal.tool === 'update_author_note') {
            clonedCard.system_prompt = `${clonedCard.system_prompt || ''}\n\n[Author Note]\n${proposal.data.content}`;
          } else if (proposal.tool === 'add_lore') {
            clonedCard.char_book ||= { entries: [] };
            if (!clonedCard.char_book.entries) {
              clonedCard.char_book.entries = [];
            }
            clonedCard.char_book.entries.push({
              keys: proposal.data.keys || ['keyword'],
              content: proposal.data.content || '',
              comment: `AI Generated - ${new Date().toLocaleTimeString()}`,
              enabled: true,
              constant: false,
              selective: true,
              uid: `ai_gen_${Date.now()}`,
            });
          } else if (proposal.tool === 'edit_prompt') {
            const matchingField = Object.keys(clonedCard).find(
              key => key.toLowerCase() === proposal.data.name.toLowerCase(),
            );
            if (matchingField && typeof clonedCard[matchingField] === 'string') {
              clonedCard[matchingField] = proposal.data.content;
              showToast(`Đã cập nhật trường '${matchingField}' của nhân vật.`, 'success');
            } else {
              clonedCard.system_prompt = `${clonedCard.system_prompt || ''}\n\n[Edit: ${proposal.data.name}]\n${proposal.data.content}`;
              showToast(`Đã thêm nội dung vào System Prompt nhân vật (Không tìm thấy trường '${proposal.data.name}').`, 'info');
            }
          } else {
            showToast('Hành động này (Move/Toggle) chỉ hỗ trợ tốt nhất trên Preset.', 'warning');
            return;
          }

          await updateActiveCharacter(clonedCard);
          showToast('Đã cập nhật Thẻ Nhân vật thành công!', 'success');
          await reloadCharacters();
        }
      } catch (error) {
        console.error(error);
        showToast(`Lỗi khi lưu: ${error instanceof Error ? error.message : String(error)}`, 'error');
      }
    };

    if (!isOpen) return null;

    const macroDocs = [
      ['{{char_book}}', 'Nội dung Sổ tay Thế giới (Lorebook) đang kích hoạt.'],
      ['{{prompt_structure}}', 'Danh sách và trạng thái (Bật/Tắt) của các Lời nhắc (Prompt) trong Preset.'],
      ['{{variables}}', 'Toàn bộ biến số hiện tại của trò chơi (stat_data).'],
      ['{{roleplay_history}}', 'Lịch sử hội thoại của câu chuyện chính (giữa User và Character).'],
      ['{{chat_history}}', 'Lịch sử trò chuyện giữa Bạn và Co-pilot này.'],
      ['{{last_outgoing_prompt}}', 'Toàn bộ lời nhắc hệ thống thực tế vừa gửi đi cho AI ở lượt trước.'],
      ['{{user_query}}', 'Câu hỏi hiện tại của bạn dành cho Co-pilot.'],
      ['{{char}} / {{user}}', 'Tên nhân vật và tên người dùng.'],
    ];

    const toolDocs = [
      ['update_variable', 'text-rose-400', 'Điều chỉnh giá trị biến số (ví dụ: HP, thiện cảm...).'],
      ['rewrite_last_turn', 'text-cyan-400', 'Viết lại nội dung phản hồi cuối cùng của nhân vật chính.'],
      ['add_prompt', 'text-green-400', 'Thêm một lời nhắc hệ thống mới vào Preset.'],
      ['move_prompt', 'text-blue-400', 'Thay đổi vị trí thứ tự của một lời nhắc.'],
      ['toggle_prompt', 'text-amber-400', 'Bật hoặc Tắt trạng thái hoạt động của một lời nhắc.'],
      ['edit_prompt', 'text-fuchsia-400', 'Chỉnh sửa nội dung của một lời nhắc có sẵn.'],
      ['add_lore', 'text-indigo-400', 'Thêm một mục World Info mới vào ngữ cảnh.'],
    ];

    return jsxRuntime.jsxs('div', {
      className: 'fixed inset-y-0 right-0 z-[60] w-[450px] max-w-full bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col    ease-in-out ',
      role: 'dialog',
      'aria-labelledby': 'copilot-title',
      children: [
        jsxRuntime.jsxs('div', {
          className: 'p-3 border-b border-slate-700 bg-slate-800/80 flex flex-col gap-3 shrink-0',
          children: [
            jsxRuntime.jsxs('div', {
              className: 'flex justify-between items-center',
              children: [
                jsxRuntime.jsxs('h3', {
                  id: 'copilot-title',
                  className: 'font-bold text-sky-400 flex items-center gap-2',
                  children: [
                    jsxRuntime.jsx('span', { children: '🤖' }),
                    ' Trợ Lý Co-pilot (Architect)',
                  ],
                }),
                jsxRuntime.jsxs('div', {
                  className: 'flex items-center gap-1',
                  children: [
                    jsxRuntime.jsx('button', {
                      onClick: () => setIsPromptSettingsOpen(!isPromptSettingsOpen),
                      className: `p-1.5 rounded  ${
                        isPromptSettingsOpen ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
                      }`,
                      title: 'Cài đặt Prompt Co-pilot',
                      children: jsxRuntime.jsx(Icon, { name: 'settings', className: 'h-4 w-4' }),
                    }),
                    jsxRuntime.jsx('button', {
                      onClick: () => setChatMessages([{
                        role: 'model',
                        content: 'Đã làm mới cuộc trò chuyện. Tôi có thể giúp gì cho bạn?',
                      }]),
                      className: 'p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded ',
                      title: 'Cuộc trò chuyện mới',
                      children: jsxRuntime.jsx(Icon, { name: 'plus', className: 'h-4 w-4' }),
                    }),
                    jsxRuntime.jsx('button', {
                      onClick: onClose,
                      className: 'p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded ',
                      'aria-label': 'Đóng Co-pilot',
                      children: jsxRuntime.jsx(Icon, { name: 'close', className: 'h-4 w-4' }),
                    }),
                  ],
                }),
              ],
            }),
            jsxRuntime.jsxs('div', {
              children: [
                jsxRuntime.jsx('label', {
                  className: 'text-[10px] uppercase font-bold text-slate-500 mb-1 block',
                  children: 'Model Trợ Lý',
                }),
                jsxRuntime.jsxs('div', {
                  className: 'flex items-center gap-2',
                  children: [
                    jsxRuntime.jsx('select', {
                      'aria-label': 'Model Trợ Lý',
                      value: selectedModel,
                      onChange: event => setSelectedModel(event.target.value),
                      className: 'flex-1 min-w-0 bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-slate-300 focus:ring-1 focus:ring-sky-500 outline-none',
                      children: geminiModels.map(model => jsxRuntime.jsx('option', {
                        value: model.id,
                        children: model.name,
                      }, model.id)),
                    }),
                    ModelTestButton && buildSavedProbeTarget && testModel && jsxRuntime.jsx(ModelTestButton, {
                      target: buildSavedProbeTarget({
                        provider: 'gemini',
                        model: selectedModel,
                        connections,
                        proxyPersistence,
                      }),
                      testModel,
                      notify: showToast,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
        jsxRuntime.jsx('div', {
          className: 'flex-grow overflow-hidden relative flex flex-col',
          children: isPromptSettingsOpen
            ? jsxRuntime.jsxs('div', {
                className: 'absolute inset-0 bg-slate-900 z-10 flex flex-col p-4 ',
                children: [
                  jsxRuntime.jsxs('div', {
                    className: 'flex justify-between items-center mb-4',
                    children: [
                      jsxRuntime.jsx('h4', {
                        className: 'font-bold text-slate-200',
                        children: 'Cấu hình Prompt Co-pilot',
                      }),
                      jsxRuntime.jsx('button', {
                        onClick: () => setSystemPromptTemplate(defaultCopilotSystemPrompt),
                        className: 'text-xs text-sky-400 hover:underline',
                        children: 'Khôi phục mặc định',
                      }),
                    ],
                  }),
                  jsxRuntime.jsxs('div', {
                    className: 'flex-grow flex flex-col',
                    children: [
                      jsxRuntime.jsx('textarea', {
                        value: systemPromptTemplate,
                        'aria-label': 'Lời nhắc hệ thống Co-pilot',
                        onChange: event => setSystemPromptTemplate(event.target.value),
                        className: 'flex-grow w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-xs font-mono text-slate-300 focus:ring-1 focus:ring-indigo-500 resize-none',
                        placeholder: 'Nhập prompt hệ thống...',
                      }),
                      jsxRuntime.jsxs('div', {
                        className: 'mt-3 text-[10px] text-slate-400 bg-slate-950/50 p-3 rounded border border-slate-800 h-64 overflow-y-auto custom-scrollbar',
                        children: [
                          jsxRuntime.jsx('h5', {
                            className: 'font-bold text-slate-300 mb-2 border-b border-slate-700 pb-1',
                            children: '1. Các Biến số (Macros)',
                          }),
                          jsxRuntime.jsx('div', {
                            className: 'space-y-3 mb-4',
                            children: macroDocs.map(([macroName, desc]) => jsxRuntime.jsxs('div', {
                              children: [
                                jsxRuntime.jsx('code', {
                                  className: 'text-sky-400 font-mono font-bold',
                                  children: macroName,
                                }),
                                jsxRuntime.jsx('p', {
                                  className: 'pl-2 text-slate-500 mt-0.5',
                                  children: desc,
                                }),
                              ],
                            }, macroName)),
                          }),
                          jsxRuntime.jsx('h5', {
                            className: 'font-bold text-slate-300 mb-2 border-b border-slate-700 pb-1',
                            children: '2. Các Công cụ (Tools) AI có thể gọi',
                          }),
                          jsxRuntime.jsx('div', {
                            className: 'space-y-3',
                            children: toolDocs.map(([toolName, colorClass, desc]) => jsxRuntime.jsxs('div', {
                              children: [
                                jsxRuntime.jsx('code', {
                                  className: `${colorClass} font-mono font-bold`,
                                  children: toolName,
                                }),
                                jsxRuntime.jsx('p', {
                                  className: 'pl-2 text-slate-500 mt-0.5',
                                  children: desc,
                                }),
                              ],
                            }, toolName)),
                          }),
                        ],
                      }),
                    ],
                  }),
                  jsxRuntime.jsx('button', {
                    onClick: () => setIsPromptSettingsOpen(false),
                    className: 'mt-4 w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg ',
                    children: 'Lưu & Quay lại',
                  }),
                ],
              })
            : jsxRuntime.jsxs('div', {
                className: 'flex-grow overflow-y-auto custom-scrollbar p-3 space-y-3 bg-slate-900',
                children: [
                  chatMessages.map((message, index) => jsxRuntime.jsx('div', {
                    className: `flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`,
                    children: jsxRuntime.jsx('div', {
                      className: `max-w-[95%] rounded-lg p-3 text-sm ${
                        message.role === 'user'
                          ? 'bg-sky-700 text-white rounded-tr-none'
                          : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
                      }`,
                      children: message.role === 'model'
                        ? jsxRuntime.jsxs(jsxRuntime.Fragment, {
                            children: [
                              jsxRuntime.jsx('div', {
                                className: 'markdown-content',
                                dangerouslySetInnerHTML: {
                                  __html: htmlSanitizer.sanitize(markdownParser.parse(message.content)),
                                },
                              }),
                              message.actionProposal && jsxRuntime.jsx(ActionProposal, {
                                proposal: message.actionProposal,
                                onExecute: scope => handleExecuteProposal(message.actionProposal, scope),
                              }),
                            ],
                          })
                        : message.content,
                    }),
                  }, index)),
                  isSending && jsxRuntime.jsx('div', {
                    className: 'flex items-start',
                    children: jsxRuntime.jsxs('div', {
                      className: 'bg-slate-800 rounded-lg p-2 rounded-tl-none border border-slate-700 flex items-center gap-2 text-slate-400 text-xs',
                      children: [
                        jsxRuntime.jsx(LoadingIndicator, { message: '' }),
                        jsxRuntime.jsx('span', { children: 'Đang phân tích dữ liệu...' }),
                      ],
                    }),
                  }),
                  jsxRuntime.jsx('div', { ref: scrollBottomRef }),
                ],
              }),
        }),
        !isPromptSettingsOpen && jsxRuntime.jsx('div', {
          className: 'p-3 border-t border-slate-700 bg-slate-800 shrink-0',
          children: jsxRuntime.jsxs('div', {
            className: 'relative',
            children: [
              jsxRuntime.jsx('textarea', {
                value: inputText,
                'aria-label': 'Tin nhắn cho Co-pilot',
                onChange: event => setInputText(event.target.value),
                onKeyDown: event => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    handleSendQuery();
                  }
                },
                placeholder: 'Hỏi Co-pilot (Ví dụ: Tại sao chỉ số HP lại giảm?)...',
                rows: 2,
                disabled: isSending,
                className: 'w-full bg-slate-900 border border-slate-600 rounded-lg p-2 pr-10 text-sm text-slate-200 focus:outline-none focus:border-sky-500 resize-none',
              }),
              jsxRuntime.jsx('button', {
                onClick: handleSendQuery,
                disabled: !inputText.trim() || isSending,
                className: 'absolute bottom-2 right-2 p-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-md  disabled:bg-slate-700 disabled:text-slate-500',
                'aria-label': 'Gửi tin nhắn cho Co-pilot',
                children: jsxRuntime.jsx(Icon, { name: 'send', className: 'h-4 w-4' }),
              }),
            ],
          }),
        }),
      ],
    });
  };
}

export function createVariableTree(getDependencies) {
  return function VariableTree({ data, level = 0 }) {
    const { react, jsxRuntime } = resolveRpgDependencies(getDependencies);
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

export function createVariableHud(getDependencies) {
  return function VariableHud({ variables, isOpen, onClose }) {
    const { VariableTree, Icon, jsxRuntime } = resolveRpgDependencies(getDependencies);
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
    const { RpgCellEditor, Icon, jsxRuntime } = resolveRpgDependencies(getDependencies);
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

export function createRpgTableEditor(getDependencies) {
  return function RpgTableEditor({ table }) {
    const {
      RpgTableRow,
      react,
      useToast,
      Icon,
      sessionStore,
      jsxRuntime,
    } = resolveRpgDependencies(getDependencies);

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

export function createRpgImportDialog(getDependencies) {
  return function RpgImportDialog({ database, onImport }) {
    const {
      parseLooseJson,
      react,
      useToast,
      Icon,
      jsxRuntime,
    } = resolveRpgDependencies(getDependencies);

    const { showToast } = useToast();
    const [importMode, setImportMode] = react.useState('merge');
    const [jsonInputText, setJsonInputText] = react.useState('');
    const fileInputRef = react.useRef(null);

    const processImportedPayload = payload => {
      try {
        let normalized = payload;
        if (payload.data && payload.data.tables) {
          normalized = payload.data;
        } else if (payload.template && payload.template.tables) {
          normalized = payload.template;
        } else if (payload.config && payload.config.id && !payload.tables) {
          normalized = {
            version: database.version || '2.0',
            lastUpdated: Date.now(),
            tables: [{ config: payload.config, data: payload.data || { rows: [] } }],
          };
        }

        if (!normalized.tables || !Array.isArray(normalized.tables)) {
          throw new Error('Cấu trúc file không hợp lệ (Thiếu danh sách bảng).');
        }

        if (importMode === 'overwrite') {
          onImport(normalized);
          showToast('Đã ghi đè dữ liệu thành công!', 'success');
        } else {
          const mergedDatabase = JSON.parse(JSON.stringify(database));
          const mergedTables = mergedDatabase.tables;
          normalized.tables.forEach(incomingTable => {
            const existingIndex = mergedTables.findIndex(table => table.config.id === incomingTable.config.id);
            if (existingIndex !== -1) {
              if (incomingTable.data?.rows) {
                mergedTables[existingIndex].data.rows = [
                  ...mergedTables[existingIndex].data.rows,
                  ...incomingTable.data.rows,
                ];
              }
            } else {
              mergedTables.push(incomingTable);
            }
          });
          mergedDatabase.lastUpdated = Date.now();
          onImport(mergedDatabase);
          showToast('Đã gộp dữ liệu thành công!', 'success');
        }
      } catch (error) {
        showToast(`Lỗi nhập liệu: ${error instanceof Error ? error.message : String(error)}`, 'error');
      }
    };

    const handleDownloadFullSave = () => {
      const exportPayload = JSON.parse(JSON.stringify(database));
      exportPayload.meta = {
        exportedAt: new Date().toISOString(),
        type: 'mythic_rpg_full_save',
      };
      downloadJsonFile(exportPayload, `MythicRPG_Data_${Date.now()}.json`);
      showToast('Đã tải xuống file dữ liệu!', 'success');
    };

    const handleFileSelect = event => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = loadEvent => {
        try {
          const parsed = JSON.parse(loadEvent.target?.result);
          processImportedPayload(parsed);
          event.target.value = '';
        } catch {
          showToast('Lỗi đọc file JSON.', 'error');
        }
      };
      reader.readAsText(file);
    };

    const handleImportFromText = () => {
      if (!jsonInputText.trim()) return;
      try {
        const parsed = parseLooseJson(jsonInputText);
        processImportedPayload(parsed);
        setJsonInputText('');
      } catch {
        showToast('Văn bản JSON không hợp lệ.', 'error');
      }
    };

    return jsxRuntime.jsxs('div', {
      className: 'p-6 h-full overflow-y-auto custom-scrollbar flex flex-col gap-8',
      children: [
        jsxRuntime.jsxs('div', {
          className: 'bg-slate-800/50 border border-slate-700 rounded-xl p-6 text-center',
          children: [
            jsxRuntime.jsx('div', { className: 'text-4xl mb-4', children: '📤' }),
            jsxRuntime.jsx('h3', {
              className: 'text-lg font-bold text-emerald-400 mb-2',
              children: 'Xuất Dữ Liệu',
            }),
            jsxRuntime.jsx('p', {
              className: 'text-sm text-slate-400 mb-4',
              children: 'Lưu toàn bộ bảng và dữ liệu hiện tại về máy.',
            }),
            jsxRuntime.jsxs('button', {
              onClick: handleDownloadFullSave,
              className: 'w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-lg  active:scale-95 flex items-center justify-center gap-2',
              children: [
                jsxRuntime.jsx(Icon, { name: 'download', className: 'h-4 w-4' }),
                'Tải xuống (Full Save)',
              ],
            }),
          ],
        }),
        jsxRuntime.jsxs('div', {
          className: 'bg-slate-800/50 border border-slate-700 rounded-xl p-6',
          children: [
            jsxRuntime.jsxs('div', {
              className: 'flex items-center gap-2 mb-4',
              children: [
                jsxRuntime.jsx('span', { className: 'text-2xl', children: '📥' }),
                jsxRuntime.jsx('h3', {
                  className: 'text-lg font-bold text-sky-400',
                  children: 'Nhập Dữ Liệu',
                }),
              ],
            }),
            jsxRuntime.jsxs('div', {
              className: 'flex gap-4 mb-6 bg-slate-900/50 p-2 rounded-lg border border-slate-700/50',
              children: [
                jsxRuntime.jsxs('label', {
                  className: 'flex-1 flex items-center justify-center gap-2 cursor-pointer p-2 rounded  hover:bg-slate-800',
                  children: [
                    jsxRuntime.jsx('input', {
                      type: 'radio',
                      name: 'importMode',
                      'aria-label': 'Gộp dữ liệu RPG',
                      checked: importMode === 'merge',
                      onChange: () => setImportMode('merge'),
                      className: 'accent-sky-500',
                    }),
                    jsxRuntime.jsx('span', {
                      className: importMode === 'merge' ? 'text-sky-400 font-bold' : 'text-slate-400',
                      children: 'Gộp (Merge)',
                    }),
                  ],
                }),
                jsxRuntime.jsxs('label', {
                  className: 'flex-1 flex items-center justify-center gap-2 cursor-pointer p-2 rounded  hover:bg-slate-800',
                  children: [
                    jsxRuntime.jsx('input', {
                      type: 'radio',
                      name: 'importMode',
                      'aria-label': 'Ghi đè dữ liệu RPG',
                      checked: importMode === 'overwrite',
                      onChange: () => setImportMode('overwrite'),
                      className: 'accent-red-500',
                    }),
                    jsxRuntime.jsx('span', {
                      className: importMode === 'overwrite' ? 'text-red-400 font-bold' : 'text-slate-400',
                      children: 'Ghi đè (Overwrite)',
                    }),
                  ],
                }),
              ],
            }),
            jsxRuntime.jsxs('div', {
              className: 'space-y-4',
              children: [
                jsxRuntime.jsxs('div', {
                  className: 'grid grid-cols-1 gap-2',
                  children: [
                    jsxRuntime.jsxs('button', {
                      onClick: () => fileInputRef.current?.click(),
                      className: 'w-full py-4 border-2 border-dashed border-slate-600 hover:border-sky-500 rounded-lg text-slate-400 hover:text-sky-400  flex flex-col items-center justify-center gap-1',
                      children: [
                        jsxRuntime.jsx(Icon, { name: 'upload', className: 'h-6 w-6' }),
                        jsxRuntime.jsx('span', { children: 'Chọn file JSON' }),
                      ],
                    }),
                    jsxRuntime.jsx('input', {
                      type: 'file',
                      'aria-label': 'Chọn tệp JSON để nhập',
                      ref: fileInputRef,
                      className: 'hidden',
                      accept: '.json',
                      onChange: handleFileSelect,
                    }),
                  ],
                }),
                jsxRuntime.jsxs('div', {
                  className: 'relative',
                  children: [
                    jsxRuntime.jsx('textarea', {
                      value: jsonInputText,
                      'aria-label': 'Dữ liệu RPG JSON',
                      onChange: event => setJsonInputText(event.target.value),
                      placeholder: 'Hoặc dán mã JSON vào đây...',
                      rows: 3,
                      className: 'w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-xs font-mono text-slate-300 focus:ring-1 focus:ring-sky-500',
                    }),
                    jsxRuntime.jsx('button', {
                      onClick: handleImportFromText,
                      disabled: !jsonInputText.trim(),
                      className: 'absolute bottom-2 right-2 px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded shadow disabled:opacity-50 disabled:cursor-not-allowed',
                      children: 'Nhập Ngay',
                    }),
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
    } = resolveRpgDependencies(getDependencies);

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