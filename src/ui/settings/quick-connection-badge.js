export function createQuickConnectionBadge(getDependencies) {
  return function QuickConnectionBadge({ presetName, onClick }) {
    const {
      getActiveModelDisplayName,
      Icon,
      getConnectionSettings,
      jsxRuntime,
    } = getDependencies();

    const connectionSettings = getConnectionSettings();
    const activeModelLabel = getActiveModelDisplayName();
    const theme = connectionSettings.source === 'openrouter'
      ? {
          bg: 'bg-purple-900/40 hover:bg-purple-900/60',
          border: 'border-purple-500/30',
          text: 'text-purple-200',
        }
      : connectionSettings.source === 'proxy'
        ? {
            bg: 'bg-cyan-900/40 hover:bg-cyan-900/60',
            border: 'border-cyan-500/30',
            text: 'text-cyan-200',
          }
        : {
            bg: 'bg-sky-900/40 hover:bg-sky-900/60',
            border: 'border-sky-500/30',
            text: 'text-sky-200',
          };

    const sourceTag = connectionSettings.source === 'openrouter'
      ? 'OR'
      : (connectionSettings.source === 'proxy' ? 'PRX' : 'AI');

    return jsxRuntime.jsxs('button', {
      onClick,
      className: `group flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-medium   ${theme.bg} ${theme.border} ${theme.text} max-w-[280px] sm:max-w-[350px] shadow-sm`,
      title: 'Nhấn để cấu hình Nhanh (Model & Preset)',
      children: [
        jsxRuntime.jsxs('div', {
          className: 'flex items-center gap-1.5 shrink-0 min-w-0 max-w-[60%]',
          children: [
            jsxRuntime.jsx('span', {
              className: 'opacity-60 text-[9px] uppercase tracking-wider font-bold',
              children: sourceTag,
            }),
            jsxRuntime.jsx('span', {
              className: 'truncate font-bold',
              children: activeModelLabel,
            }),
          ],
        }),
        jsxRuntime.jsx('div', { className: `w-px h-3 ${theme.text} opacity-20` }),
        jsxRuntime.jsxs('div', {
          className: 'flex items-center gap-1.5 shrink-0 min-w-0 max-w-[40%]',
          children: [
            jsxRuntime.jsx('span', {
              className: 'text-xs font-bold',
              children: jsxRuntime.jsx(Icon, { name: 'preset', className: 'h-3.5 w-3.5' }),
            }),
            jsxRuntime.jsx('span', {
              className: 'truncate opacity-90',
              children: presetName || 'Default',
            }),
          ],
        }),
      ],
    });
  };
}
