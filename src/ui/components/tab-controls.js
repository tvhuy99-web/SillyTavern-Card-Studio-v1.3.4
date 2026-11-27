export function handleTabKeyDown(event) {
  const { key, currentTarget } = event;
  if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(key)) return;
  const tablist = currentTarget.closest('[role="tablist"]');
  const tabs = tablist ? [...tablist.querySelectorAll('[role="tab"]:not([disabled])')] : [];
  const index = tabs.indexOf(currentTarget);
  if (index < 0 || tabs.length === 0) return;
  const nextIndex = key === 'Home' ? 0 : key === 'End' ? tabs.length - 1 :
    key === 'ArrowRight' || key === 'ArrowDown' ? (index + 1) % tabs.length : (index - 1 + tabs.length) % tabs.length;
  event.preventDefault();
  tabs[nextIndex].focus();
  tabs[nextIndex].click();
}

export function createPresetTab({ jsx }) {
  return function PresetTab({ tabId, currentTab, onClick, children }) {
    const selected = currentTab === tabId;
    return jsx('button', {
      role: 'tab', id: `preset-subtab-${tabId}`, 'aria-controls': `preset-subtabpanel-${tabId}`,
      'aria-selected': selected, tabIndex: selected ? 0 : -1,
      onClick: () => onClick(tabId), onKeyDown: handleTabKeyDown,
      className: 'px-4 py-2 text-sm font-medium rounded-md   focus:outline-none ' + (selected ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'),
      children,
    });
  };
}

export function createSettingsTab({ jsx, jsxs }) {
  return function SettingsTab({ tabId, currentTab, onClick, children }) {
    const selected = currentTab === tabId;
    return jsxs('button', {
      role: 'tab', id: `settings-subtab-${tabId}`, 'aria-controls': `settings-subtabpanel-${tabId}`,
      'aria-selected': selected, tabIndex: selected ? 0 : -1,
      onClick: () => onClick(tabId), onKeyDown: handleTabKeyDown,
      className: 'settings-nav-button px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ' + (selected ? 'is-active bg-sky-600 text-white' : 'text-slate-300 bg-slate-700 hover:bg-slate-600'),
      children: [jsx('span', { className: 'settings-nav-button__dot', 'aria-hidden': 'true' }), jsx('span', { children })],
    });
  };
}

export function createMainTab({ jsx, jsxs }, Icon) {
  return function MainTab({ tabId, currentTab, onClick, disabled = false, children }) {
    const selected = currentTab === tabId;
    return jsxs('button', {
      role: 'tab', 'aria-selected': selected, 'aria-controls': `tabpanel-${tabId}`,
      id: `tab-${tabId}`, tabIndex: selected ? 0 : -1,
      onClick: () => !disabled && onClick(tabId), onKeyDown: handleTabKeyDown, disabled,
      className: `app-main-tab flex-shrink-0 whitespace-nowrap px-4 py-2 text-sm md:text-base font-medium rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${selected ? 'bg-slate-800 text-sky-400' : 'text-slate-400 hover:text-white'} ${disabled ? 'cursor-not-allowed text-slate-600' : ''}`,
      children: [jsx(Icon, { name: tabId, className: 'h-4 w-4' }), jsx('span', { children })],
    });
  };
}
