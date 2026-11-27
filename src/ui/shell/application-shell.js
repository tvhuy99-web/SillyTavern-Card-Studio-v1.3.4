export function createAppHeader({ jsx, jsxs }, Icon) {
  return function AppHeader() {
    return jsx('header', {
      className: 'app-header bg-slate-800/50 shadow-lg sticky top-0 z-40',
      children: jsx('div', {
        className: 'app-header-inner container mx-auto px-4 sm:px-6 lg:px-8',
        children: jsxs('div', {
          className: 'flex items-center justify-between h-16 gap-4',
          children: [
            jsxs('div', {
              className: 'flex items-center min-w-0',
              children: [jsx('div', { className: 'app-brand-mark', children: jsx(Icon, { name: 'brand', className: 'h-6 w-6' }) }),
                jsxs('div', { className: 'min-w-0', children: [
                  jsx('h1', { className: 'text-lg sm:text-xl font-bold text-white truncate', children: 'SillyTavern Card Studio' }),
                  jsx('p', { className: 'hidden sm:block text-[11px] text-slate-400 tracking-wide', children: 'Không gian sáng tạo nhân vật, preset và thế giới' }),
                ] })],
            }),
            jsxs('div', { className: 'app-version', title: 'Phiên bản ứng dụng 1.3.6', children: [
              jsx('span', { className: 'app-version__dot', 'aria-hidden': 'true' }), jsx('span', { children: 'v1.3.6' }),
            ] }),
          ],
        }),
      }),
    });
  };
}

export function createApplicationShell({ jsx, jsxs }, { useState }, { Header, MainTab, Characters, Presets, Lorebooks, Chat, Settings }) {
  return function ApplicationShell() {
    const [activeTab, setActiveTab] = useState('character');
    const [activeSessionId, setActiveSessionId] = useState(null);
    function renderScreen() {
      switch (activeTab) {
        case 'character': return jsx(Characters, {});
        case 'preset': return jsx(Presets, {});
        case 'lorebook': return jsx(Lorebooks, {});
        case 'chat': return jsx(Chat, { activeSessionId, onSessionSelect: setActiveSessionId, onCloseSession: () => setActiveSessionId(null) });
        case 'settings': return jsx(Settings, {});
        default: return null;
      }
    }
    return jsxs('div', {
      className: 'app-shell min-h-screen bg-slate-900 font-sans flex flex-col',
      children: [jsx(Header, {}), jsxs('main', {
        id: 'main-content', className: 'app-main container mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-4 md:py-6 flex flex-col flex-grow',
        children: [jsx('div', {
          className: 'app-main-tabs-wrap border-b border-slate-700 mb-6',
          children: jsxs('nav', {
            role: 'tablist', className: 'app-main-tabs flex gap-2 overflow-x-auto overscroll-x-contain', 'aria-label': 'Điều hướng chính',
            children: [
              jsx(MainTab, { tabId: 'character', currentTab: activeTab, onClick: setActiveTab, children: 'Nhân vật' }),
              jsx(MainTab, { tabId: 'preset', currentTab: activeTab, onClick: setActiveTab, children: 'Preset' }),
              jsx(MainTab, { tabId: 'lorebook', currentTab: activeTab, onClick: setActiveTab, children: 'Sổ tay Thế giới' }),
              jsx(MainTab, { tabId: 'chat', currentTab: activeTab, onClick: setActiveTab, children: 'Trò chuyện' }),
              jsx(MainTab, { tabId: 'settings', currentTab: activeTab, onClick: setActiveTab, children: 'Cài đặt' }),
            ],
          }),
        }), jsx('div', {
          role: 'tabpanel', id: `tabpanel-${activeTab}`, 'aria-labelledby': `tab-${activeTab}`,
          className: 'app-tab-panel flex-grow flex flex-col focus:outline-none', tabIndex: 0, children: renderScreen(),
        })],
      })],
    });
  };
}
