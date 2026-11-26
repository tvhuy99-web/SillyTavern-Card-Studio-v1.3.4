// Recovered application UI. The existing React instance and feature dependencies are injected.
// Semantic dependency contract: callers inject named dependencies directly.

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
    } = getDependencies();

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
