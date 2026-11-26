// Recovered application UI. The existing React instance and feature dependencies are injected.
// Semantic dependency contract: callers inject named dependencies directly.

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
    } = getDependencies();

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
