// Semantic dependency contract: callers inject named dependencies directly.
// Factories receive the existing React/runtime bindings lazily to preserve initialization order.

function resolveFileNameDialogDeps(getDependencies) {
  const deps = getDependencies();
  return {
    react: deps.react,
    jsxRuntime: deps.jsxRuntime,
    useDialogFocus: deps.useDialogFocus,
  };
}

export function createFileNameDialog(getDependencies) {
  return function FileNameDialog({
    isOpen,
    onClose,
    onConfirm,
    initialFileName,
    title,
    fileExtension,
  }) {
    const {
      react,
      jsxRuntime,
      useDialogFocus,
    } = resolveFileNameDialogDeps(getDependencies);

    const [fileName, setFileName] = react.useState('');
    const inputRef = react.useRef(null);
    const dialogRef = react.useRef(null);

    useDialogFocus(isOpen, onClose, dialogRef, inputRef);

    react.useEffect(() => {
      if (isOpen) {
        const strippedName = initialFileName.replace(new RegExp(`${fileExtension}$`, 'i'), '');
        setFileName(strippedName);
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
          }
        }, 50);
      }
    }, [isOpen, initialFileName, fileExtension]);

    const handleConfirm = () => {
      if (fileName.trim()) {
        onConfirm(`${fileName.replace(/[<>:"/\\|?*]/g, '')}${fileExtension}`);
        onClose();
      }
    };

    if (!isOpen) return null;

    return jsxRuntime.jsx('div', {
      className: 'fixed inset-0 bg-black/70  flex items-center justify-center z-[200] p-4',
      onClick: onClose,
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'export-dialog-title',
      children: jsxRuntime.jsxs('div', {
        ref: dialogRef,
        className: 'bg-slate-800 border border-slate-600 rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden ',
        onClick: event => event.stopPropagation(),
        children: [
          jsxRuntime.jsxs('div', {
            className: 'p-4 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center',
            children: [
              jsxRuntime.jsx('h3', {
                id: 'export-dialog-title',
                className: 'text-lg font-bold text-sky-400',
                children: title,
              }),
              jsxRuntime.jsx('button', {
                onClick: onClose,
                className: 'text-slate-400 hover:text-white ',
                'aria-label': 'Đóng',
                children: jsxRuntime.jsx('svg', {
                  'aria-hidden': 'true',
                  xmlns: 'http://www.w3.org/2000/svg',
                  className: 'h-5 w-5',
                  viewBox: '0 0 20 20',
                  fill: 'currentColor',
                  children: jsxRuntime.jsx('path', {
                    fillRule: 'evenodd',
                    d: 'M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z',
                    clipRule: 'evenodd',
                  }),
                }),
              }),
            ],
          }),
          jsxRuntime.jsx('div', {
            className: 'p-6 space-y-4',
            children: jsxRuntime.jsxs('div', {
              children: [
                jsxRuntime.jsx('label', {
                  htmlFor: 'export-file-name',
                  className: 'block text-sm font-medium text-slate-300 mb-2',
                  children: 'Tên tập tin',
                }),
                jsxRuntime.jsxs('div', {
                  className: 'relative flex items-center',
                  children: [
                    jsxRuntime.jsx('input', {
                      id: 'export-file-name',
                      ref: inputRef,
                      type: 'text',
                      value: fileName,
                      onChange: event => setFileName(event.target.value),
                      onKeyDown: event => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          handleConfirm();
                        } else if (event.key === 'Escape') {
                          onClose();
                        }
                      },
                      className: 'w-full bg-slate-700 border border-slate-600 rounded-md p-3 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition pr-16',
                      placeholder: 'Nhập tên file...',
                    }),
                    jsxRuntime.jsx('span', {
                      className: 'absolute right-3 text-slate-500 select-none text-sm font-mono',
                      children: fileExtension,
                    }),
                  ],
                }),
                jsxRuntime.jsx('p', {
                  className: 'text-xs text-slate-500 mt-2',
                  children: 'Nhấn Enter để tải xuống. Ký tự đặc biệt sẽ tự động bị loại bỏ.',
                }),
              ],
            }),
          }),
          jsxRuntime.jsxs('div', {
            className: 'p-4 border-t border-slate-700 bg-slate-900/30 flex justify-end gap-3',
            children: [
              jsxRuntime.jsx('button', {
                onClick: onClose,
                className: 'px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium ',
                children: 'Hủy',
              }),
              jsxRuntime.jsx('button', {
                onClick: handleConfirm,
                className: 'px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold shadow-lg shadow-sky-900/20 ',
                children: 'Tải xuống',
              }),
            ],
          }),
        ],
      }),
    });
  };
}