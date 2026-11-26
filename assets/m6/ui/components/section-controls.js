// Presentation only: these components own layout and local navigation, not data.
export function createTooltip({ jsx, jsxs, Fragment }) {
  return function Tooltip({ text, children }) {
    if (!text) return jsx(Fragment, { children });
    return jsxs('div', {
      className: 'relative group inline-flex items-center',
      children: [children, jsxs('div', {
        'aria-hidden': 'true',
        className: 'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max max-w-xs p-3\n                      bg-slate-900 text-slate-200 text-xs font-medium rounded-md shadow-lg border border-slate-700\n                      opacity-0 group-hover:opacity-100 group-focus-within:opacity-100   pointer-events-none z-20',
        children: [text, jsx('div', {
          className: 'absolute top-full left-1/2 -translate-x-1/2 w-0 h-0\n                        border-x-4 border-x-transparent\n                        border-t-4 border-t-slate-700',
          'aria-hidden': 'true',
        })],
      })],
    });
  };
}

export function createCollapsibleSection({ jsx, jsxs }) {
  return function CollapsibleSection({ title, description, children, defaultOpen = true }) {
    return jsxs('details', {
      className: 'app-section bg-slate-800/50 rounded-xl shadow-lg open:mb-4 group', defaultOpen,
      children: [
        jsxs('summary', {
          className: 'p-4 cursor-pointer list-none flex justify-between items-center outline-none select-none hover:bg-slate-800/80 rounded-xl ',
          children: [
            jsx('h3', { className: 'text-lg font-bold text-sky-400 group-hover:text-sky-300  flex items-center gap-2', children: title }),
            jsx('svg', {
              className: 'w-5 h-5 text-slate-500    group-open:rotate-180', xmlns: 'http://www.w3.org/2000/svg',
              fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', 'aria-hidden': 'true',
              children: jsx('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: '2', d: 'M19 9l-7 7-7-7' }),
            }),
          ],
        }),
        jsxs('div', {
          className: 'px-4 pb-4 pt-0 space-y-4 border-t border-slate-700/50 mt-2',
          children: [description && jsx('p', { className: 'pt-3 text-sm text-slate-400', children: description }), children],
        }),
      ],
    });
  };
}

export function createSectionNavigator({ jsx, jsxs }) {
  function navigate(event, target) {
    const editor = event.currentTarget.closest('.character-editor');
    const section = editor ? [...editor.querySelectorAll('.app-section')]
      .find(item => item.querySelector('h3')?.textContent?.includes(target)) : null;
    if (section) {
      section.open = true;
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
  return function SectionNavigator({ items }) {
    return jsxs('nav', {
      className: 'app-section-navigator', 'aria-label': 'Điều hướng nhanh các phần',
      children: [
        jsx('span', { className: 'app-section-navigator__label', children: 'Đi đến' }),
        jsx('div', {
          className: 'app-section-navigator__items',
          children: items.map(item => jsx('button', {
            type: 'button', onClick: event => navigate(event, item.target), children: item.label,
          }, item.target)),
        }),
      ],
    });
  };
}
