export function createChatHeader(getDependencies) {
  return function ChatHeader({
    characterName,
    onBack,
    isImmersive,
    visualState,
    onVisualUpdate,
    onToggleHUD,
    isHUDOpen,
    onToggleStatusHUD,
    isStatusHUDOpen,
    activePresetName,
    onPresetChange,
    activePersonaId,
    onPersonaChange,
    onToggleAssistant,
    isAssistantOpen,
    onToggleRpgDashboard,
    isRpgDashboardOpen,
    hasRpgData,
    onSyncLorebook,
    isSyncingLorebook,
  }) {
    const {
      react,
      ArenaSettingsDialog,
      QuickConnectionDialog,
      SpeechControls,
      Icon,
      sessionStore,
      QuickConnectionBadge,
      ChatSettingsDialog,
      jsxRuntime,
    } = getDependencies();

    const [isSettingsOpen, setIsSettingsOpen] = react.useState(false);
    const [isQuickConnectionOpen, setIsQuickConnectionOpen] = react.useState(false);
    const [isArenaSettingsOpen, setIsArenaSettingsOpen] = react.useState(false);
    const [connectionRefreshKey, setConnectionRefreshKey] = react.useState(0);
    const settingsButtonRef = react.useRef(null);
    const { isArenaMode, setArenaMode, arenaModelId } = sessionStore();

    return jsxRuntime.jsxs('div', {
      className: isImmersive
        ? 'chat-topbar p-3 bg-slate-900/60 border-b border-white/10 flex items-center gap-4 relative z-10 hover:bg-slate-900/80'
        : 'chat-topbar p-3 border-b border-slate-700 flex items-center gap-4 relative z-10 bg-slate-800/80',
      children: [
        jsxRuntime.jsx('button', {
          onClick: onBack,
          className: 'chat-icon-button text-slate-400 hover:text-sky-400',
          title: 'Quay lại',
          'aria-label': 'Quay lại sảnh chờ',
          children: jsxRuntime.jsx(Icon, { name: 'arrowLeft', className: 'h-5 w-5' }),
        }),
        jsxRuntime.jsxs('div', {
          className: 'flex-grow min-w-0 flex flex-col justify-center',
          children: [
            jsxRuntime.jsx('div', {
              className: 'flex items-center gap-2 mb-0.5',
              children: jsxRuntime.jsx('h2', {
                className: 'text-lg font-bold text-slate-200 truncate',
                children: characterName,
              }),
            }),
            !isImmersive && jsxRuntime.jsxs('div', {
              className: 'flex items-center gap-3',
              children: [
                jsxRuntime.jsx(QuickConnectionBadge, {
                  presetName: activePresetName,
                  onClick: () => onPresetChange && setIsQuickConnectionOpen(!isQuickConnectionOpen),
                  refreshKey: connectionRefreshKey,
                }),
                jsxRuntime.jsxs('div', {
                  className: 'flex items-center gap-2 bg-slate-900/50 rounded-full px-2 py-0.5 border border-slate-700 relative',
                  children: [
                    jsxRuntime.jsx('button', {
                      onClick: () => setArenaMode(!isArenaMode),
                      className: `text-[10px] font-bold uppercase px-2 py-0.5 rounded  ${
                        isArenaMode ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'
                      }`,
                      title: isArenaMode ? 'Tắt chế độ Đấu trường' : 'Bật chế độ Đấu trường (So sánh Model)',
                      children: 'VS',
                    }),
                    isArenaMode && jsxRuntime.jsxs(jsxRuntime.Fragment, {
                      children: [
                        jsxRuntime.jsxs('button', {
                          onClick: () => setIsArenaSettingsOpen(!isArenaSettingsOpen),
                          className: 'text-[10px] text-rose-300 font-bold hover:text-rose-100 flex items-center gap-1 max-w-[120px]',
                          title: 'Cấu hình Đấu trường',
                          children: [
                            jsxRuntime.jsx('span', {
                              className: 'truncate',
                              children: arenaModelId || 'Chọn Model',
                            }),
                          ],
                        }),
                        jsxRuntime.jsx(ArenaSettingsDialog, {
                          isOpen: isArenaSettingsOpen,
                          onClose: () => setIsArenaSettingsOpen(false),
                        }),
                      ],
                    }),
                  ],
                }),
                jsxRuntime.jsx('div', {
                  className: 'relative',
                  children: jsxRuntime.jsx(QuickConnectionDialog, {
                    isOpen: isQuickConnectionOpen,
                    onClose: () => setIsQuickConnectionOpen(false),
                    activePresetName,
                    onPresetChange,
                    activePersonaId,
                    onPersonaChange,
                    onConnectionChange: () => setConnectionRefreshKey(count => count + 1),
                  }),
                }),
              ],
            }),
          ],
        }),
        jsxRuntime.jsx(SpeechControls, {}),
        onSyncLorebook && jsxRuntime.jsx('button', {
          onClick: onSyncLorebook,
          disabled: isSyncingLorebook,
          className: `chat-icon-button p-2 rounded-full ${
            isSyncingLorebook ? 'bg-sky-600 text-white ' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
          }`,
          title: 'Đồng bộ Lorebook Ngữ nghĩa',
          'aria-label': 'Đồng bộ Lorebook Ngữ nghĩa',
          children: jsxRuntime.jsx(Icon, { name: 'sync', className: 'h-4 w-4' }),
        }),
        hasRpgData && onToggleRpgDashboard && jsxRuntime.jsx('button', {
          onClick: onToggleRpgDashboard,
          className: `chat-icon-button p-2 rounded-full ${
            isRpgDashboardOpen
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/50'
              : 'text-slate-400 hover:bg-slate-700 hover:text-white'
          }`,
          title: 'Bật/Tắt RPG Dashboard (Mythic Engine)',
          'aria-label': 'Bật hoặc tắt RPG Dashboard',
          children: jsxRuntime.jsx(Icon, { name: 'rpg', className: 'h-4 w-4' }),
        }),
        onToggleAssistant && jsxRuntime.jsx('button', {
          onClick: onToggleAssistant,
          className: `chat-icon-button p-2 rounded-full ${
            isAssistantOpen ? 'bg-sky-600 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
          }`,
          title: 'Bật/Tắt Trợ lý Co-pilot',
          'aria-label': 'Bật hoặc tắt Trợ lý Co-pilot',
          children: jsxRuntime.jsx(Icon, { name: 'sparkles', className: 'h-4 w-4' }),
        }),
        jsxRuntime.jsxs('div', {
          className: 'relative',
          children: [
            jsxRuntime.jsx('button', {
              ref: settingsButtonRef,
              onClick: () => setIsSettingsOpen(!isSettingsOpen),
              className: `chat-icon-button p-2 rounded-full ${
                isSettingsOpen ? 'bg-slate-700 text-white' : 'text-slate-400 hover:bg-slate-700 hover:text-white'
              }`,
              title: 'Cài đặt Trò chuyện (Giao diện & Công cụ)',
              'aria-label': 'Cài đặt trò chuyện',
              children: jsxRuntime.jsx(Icon, { name: 'settings', className: 'h-4 w-4' }),
            }),
            jsxRuntime.jsx(ChatSettingsDialog, {
              isOpen: isSettingsOpen,
              onClose: () => {
                setIsSettingsOpen(false);
                settingsButtonRef.current?.focus();
              },
              visualState,
              onUpdate: onVisualUpdate,
              isHUDOpen,
              onToggleHUD,
              isStatusHUDOpen,
              onToggleStatusHUD,
            }),
          ],
        }),
      ],
    });
  };
}
