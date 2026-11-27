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

export function createRpgImportDialog(getDependencies) {
  return function RpgImportDialog({ database, onImport }) {
    const {
      parseLooseJson,
      react,
      useToast,
      Icon,
      jsxRuntime,
    } = getDependencies();

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
