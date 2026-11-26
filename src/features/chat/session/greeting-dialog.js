export function createGreetingDialog(getDependencies) {
  return function GreetingDialog({ character, onClose, onStart }) {
    const { truncateText, react, jsxRuntime } = getDependencies();
    const greetings = react.useMemo(
      () => [character.card.first_mes, ...(character.card.alternate_greetings || [])],
      [character.card],
    );
    const [expandedIndex, setExpandedIndex] = react.useState(null);
    const dialogRef = react.useRef(null);
    const closeButtonRef = react.useRef(null);
    const previousFocusRef = react.useRef(null);

    react.useEffect(() => {
      previousFocusRef.current = document.activeElement;
      setTimeout(() => closeButtonRef.current?.focus(), 100);

      const handleKeyDown = event => {
        if (event.key === 'Escape') {
          onClose();
          return;
        }
        if (event.key === 'Tab' && dialogRef.current) {
          const focusable = dialogRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
          );
          if (focusable.length === 0) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];
          if (event.shiftKey) {
            if (document.activeElement === first) {
              last.focus();
              event.preventDefault();
            }
          } else if (document.activeElement === last) {
            first.focus();
            event.preventDefault();
          }
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        previousFocusRef.current?.focus();
      };
    }, [onClose]);

    const toggleExpandGreeting = index => {
      setExpandedIndex(previous => (previous === index ? null : index));
    };

    return jsxRuntime.jsx('div', {
      className: 'fixed inset-0 bg-black/60  flex items-center justify-center z-50 p-4',
      onClick: onClose,
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'chat-start-title',
      children: jsxRuntime.jsxs('div', {
        ref: dialogRef,
        className: 'bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col',
        onClick: event => event.stopPropagation(),
        children: [
          jsxRuntime.jsxs('header', {
            className: 'p-4 border-b border-slate-700 flex justify-between items-center flex-shrink-0',
            children: [
              jsxRuntime.jsxs('div', {
                children: [
                  jsxRuntime.jsxs('h2', {
                    id: 'chat-start-title',
                    className: 'text-xl font-bold text-sky-400',
                    children: ['Bắt đầu trò chuyện với ', character.card.name],
                  }),
                  jsxRuntime.jsx('p', {
                    className: 'text-sm text-slate-400',
                    children: 'Chọn một lời chào để bắt đầu cuộc phiêu lưu của bạn.',
                  }),
                ],
              }),
              jsxRuntime.jsx('button', {
                ref: closeButtonRef,
                onClick: onClose,
                className: 'p-1 text-slate-400 hover:text-white',
                'aria-label': 'Đóng',
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
          jsxRuntime.jsx('div', {
            className: 'p-6 space-y-4 overflow-y-auto custom-scrollbar',
            children: greetings.map((greetingText, index) => {
              const isExpanded = expandedIndex === index;
              const previewText = truncateText(greetingText, 150);
              const isLongGreeting = greetingText.length > 150;
              return jsxRuntime.jsxs('div', {
                className: 'bg-slate-700/50 p-4 rounded-lg',
                children: [
                  jsxRuntime.jsx('h3', {
                    className: 'font-semibold text-slate-300 mb-2',
                    children: index === 0 ? 'Lời chào chính' : `Lời chào thay thế #${index}`,
                  }),
                  jsxRuntime.jsx('p', {
                    className: 'text-slate-400 text-sm whitespace-pre-wrap',
                    children: isExpanded ? greetingText : previewText,
                  }),
                  jsxRuntime.jsxs('div', {
                    className: 'mt-3 flex justify-between items-center',
                    children: [
                      isLongGreeting && jsxRuntime.jsx('button', {
                        onClick: () => toggleExpandGreeting(index),
                        className: 'text-xs text-sky-400 hover:text-sky-300',
                        children: isExpanded ? 'Thu gọn' : 'Xem thêm',
                      }),
                      jsxRuntime.jsx('div', { className: 'flex-grow' }),
                      jsxRuntime.jsx('button', {
                        onClick: () => onStart(greetingText),
                        className: 'px-4 py-2 text-sm font-medium rounded-md   bg-sky-600 text-white hover:bg-sky-700',
                        children: 'Bắt đầu với lời chào này',
                      }),
                    ],
                  }),
                ],
              }, index);
            }),
          }),
        ],
      }),
    });
  };
}
