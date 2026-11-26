export function createSessionListItem(getDependencies) {
  return function SessionListItem({ session, character, onClick, onDelete, onExport }) {
    const { react, relativeTimeUnits, Icon, jsxRuntime } = getDependencies();
    const [relativeUpdatedLabel, setRelativeUpdatedLabel] = react.useState('');

    react.useEffect(() => {
      const computeRelativeTime = () => {
        const elapsedSeconds = Math.floor((Date.now() - session.lastUpdated) / 1000);
        if (elapsedSeconds < 5) return 'vừa xong';
        for (const unit of relativeTimeUnits) {
          const count = Math.floor(elapsedSeconds / unit.seconds);
          if (count >= 1) return `${count} ${unit.label} trước`;
        }
        return 'vừa xong';
      };

      setRelativeUpdatedLabel(computeRelativeTime());
      const intervalId = setInterval(() => {
        setRelativeUpdatedLabel(computeRelativeTime());
      }, 60000);
      return () => clearInterval(intervalId);
    }, [session.lastUpdated]);

    const [isMenuOpen, setIsMenuOpen] = react.useState(false);
    const menuRef = react.useRef(null);

    react.useEffect(() => {
      const handleOutsideMouseDown = event => {
        if (isMenuOpen && menuRef.current && !menuRef.current.contains(event.target)) {
          setIsMenuOpen(false);
        }
      };
      document.addEventListener('mousedown', handleOutsideMouseDown);
      return () => document.removeEventListener('mousedown', handleOutsideMouseDown);
    }, [isMenuOpen]);

    const displayName = character?.card.name || session.characterFileName;

    return jsxRuntime.jsxs('div', {
      className: 'bg-slate-800/70 p-4 rounded-lg flex gap-4 items-center hover:bg-slate-700/80   group relative',
      children: [
        jsxRuntime.jsx('button', {
          onClick,
          className: 'w-16 h-16 rounded-full bg-slate-700 flex-shrink-0 overflow-hidden cursor-pointer hover:opacity-80  focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400',
          'aria-label': `Tiếp tục trò chuyện với ${displayName}`,
          children: character?.avatarUrl
            ? jsxRuntime.jsx('img', {
                src: character.avatarUrl,
                alt: '',
                className: 'w-full h-full object-cover',
              })
            : jsxRuntime.jsx('div', {
                className: 'w-full h-full flex items-center justify-center text-slate-400',
                children: jsxRuntime.jsx(Icon, { name: 'character', className: 'h-7 w-7' }),
              }),
        }),
        jsxRuntime.jsxs('div', {
          className: 'flex-grow overflow-hidden flex flex-col items-start',
          children: [
            jsxRuntime.jsx('button', {
              onClick,
              className: 'px-3 py-1 bg-slate-700 hover:bg-sky-600 text-white text-sm font-bold rounded-md  shadow-sm border border-slate-600 hover:border-sky-500 mb-1 max-w-full truncate text-left',
              children: displayName,
            }),
            jsxRuntime.jsx('p', {
              className: 'text-sm text-slate-400 italic truncate w-full',
              children: session.lastMessageSnippet || 'Bắt đầu cuộc trò chuyện...',
            }),
            jsxRuntime.jsx('p', {
              className: 'text-xs text-slate-500 mt-1',
              children: relativeUpdatedLabel,
            }),
          ],
        }),
        jsxRuntime.jsxs('div', {
          ref: menuRef,
          className: 'absolute top-2 right-2',
          children: [
            jsxRuntime.jsx('button', {
              onClick: event => {
                event.stopPropagation();
                setIsMenuOpen(previous => !previous);
              },
              className: 'p-2 rounded-full text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-slate-900/50 hover:text-white  focus:opacity-100',
              'aria-label': 'Tùy chọn cuộc trò chuyện',
              'aria-haspopup': 'true',
              'aria-expanded': isMenuOpen,
              children: jsxRuntime.jsx(Icon, { name: 'more', className: 'h-5 w-5' }),
            }),
            isMenuOpen && jsxRuntime.jsxs('div', {
              className: 'absolute right-0 mt-2 w-56 bg-slate-900 border border-slate-700 rounded-md shadow-lg z-10 py-1',
              children: [
                jsxRuntime.jsxs('button', {
                  onClick: event => {
                    event.stopPropagation();
                    onExport();
                    setIsMenuOpen(false);
                  },
                  className: 'w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-sky-400 hover:bg-sky-500/10 border-b border-slate-700/50',
                  children: [
                    jsxRuntime.jsx(Icon, { name: 'download', className: 'h-4 w-4' }),
                    jsxRuntime.jsx('span', { children: 'Xuất Bản Ghi Phiêu Lưu' }),
                  ],
                }),
                jsxRuntime.jsxs('button', {
                  onClick: event => {
                    event.stopPropagation();
                    onDelete();
                    setIsMenuOpen(false);
                  },
                  className: 'w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10',
                  children: [
                    jsxRuntime.jsx(Icon, { name: 'trash', className: 'h-4 w-4' }),
                    jsxRuntime.jsx('span', { children: 'Xóa cuộc trò chuyện' }),
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
