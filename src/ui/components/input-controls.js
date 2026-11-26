// Semantic dependency contract: callers inject named dependencies directly.
// Factories receive the existing React/runtime bindings lazily to preserve initialization order.

function resolveInputControlDeps(getDependencies) {
  const deps = getDependencies();
  return {
    react: deps.react,
    jsxRuntime: deps.jsxRuntime,
    Tooltip: deps.Tooltip,
    CopyButton: deps.CopyButton,
    Icon: deps.Icon,
  };
}

function getToastContainerTone(toastType) {
  switch (toastType) {
    case 'success':
      return 'bg-green-600/90 border-green-500 text-white';
    case 'error':
      return 'bg-red-600/90 border-red-500 text-white';
    case 'warning':
      return 'bg-amber-600/90 border-amber-500 text-white';
    default:
      return 'bg-sky-600/90 border-sky-500 text-white';
  }
}

function getToastIconName(toastType) {
  switch (toastType) {
    case 'success':
      return 'check';
    case 'error':
      return 'error';
    case 'warning':
      return 'warning';
    default:
      return 'info';
  }
}

export function createCopyButton(getDependencies) {
  return function CopyButton({
    textToCopy,
    className = '',
    label,
    absolute = true,
  }) {
    const { react, jsxRuntime } = resolveInputControlDeps(getDependencies);
    const [isCopied, setIsCopied] = react.useState(false);

    const handleCopy = event => {
      event.preventDefault();
      event.stopPropagation();
      if (textToCopy) {
        navigator.clipboard.writeText(textToCopy).then(() => {
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 2000);
        });
      }
    };

    return jsxRuntime.jsx('button', {
      type: 'button',
      onClick: handleCopy,
      className: `${
        absolute
          ? 'absolute top-2 right-2 p-1.5 rounded-md '
          : 'px-2 py-1 rounded  border flex items-center gap-1'
      } bg-slate-600/50 hover:bg-slate-500/70 text-slate-400 hover:text-white ${className}`,
      'aria-label': label || 'Sao chép',
      title: isCopied ? 'Đã sao chép!' : 'Sao chép',
      children: isCopied
        ? jsxRuntime.jsxs(jsxRuntime.Fragment, {
            children: [
              jsxRuntime.jsx('svg', {
                'aria-hidden': 'true',
                xmlns: 'http://www.w3.org/2000/svg',
                className: 'h-4 w-4 text-green-400',
                fill: 'none',
                viewBox: '0 0 24 24',
                stroke: 'currentColor',
                children: jsxRuntime.jsx('path', {
                  strokeLinecap: 'round',
                  strokeLinejoin: 'round',
                  strokeWidth: '2',
                  d: 'M5 13l4 4L19 7',
                }),
              }),
              label && jsxRuntime.jsx('span', {
                className: 'text-green-400 text-xs',
                children: 'Đã chép!',
              }),
            ],
          })
        : jsxRuntime.jsxs(jsxRuntime.Fragment, {
            children: [
              jsxRuntime.jsx('svg', {
                'aria-hidden': 'true',
                xmlns: 'http://www.w3.org/2000/svg',
                className: 'h-4 w-4',
                fill: 'none',
                viewBox: '0 0 24 24',
                stroke: 'currentColor',
                children: jsxRuntime.jsx('path', {
                  strokeLinecap: 'round',
                  strokeLinejoin: 'round',
                  strokeWidth: '2',
                  d: 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z',
                }),
              }),
              label && jsxRuntime.jsx('span', {
                className: 'text-xs',
                children: label,
              }),
            ],
          }),
    });
  };
}

export function createInlineCopyButton(getDependencies) {
  return function InlineCopyButton({ macro }) {
    const { react, jsxRuntime } = resolveInputControlDeps(getDependencies);
    const [isCopied, setIsCopied] = react.useState(false);

    const handleCopyMacro = () => {
      navigator.clipboard.writeText(macro.name).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      });
    };

    return jsxRuntime.jsxs('div', {
      className: 'flex items-center justify-between p-2 bg-slate-700/50 rounded-md hover:bg-slate-700 ',
      children: [
        jsxRuntime.jsxs('div', {
          className: 'flex-grow mr-4',
          children: [
            jsxRuntime.jsx('code', {
              className: 'text-sky-400 font-mono text-sm font-bold block mb-1',
              children: macro.name,
            }),
            jsxRuntime.jsx('p', {
              className: 'text-xs text-slate-400',
              children: macro.description,
            }),
          ],
        }),
        jsxRuntime.jsx('button', {
          onClick: handleCopyMacro,
          className: 'p-2 bg-slate-600 hover:bg-slate-500 rounded-md text-slate-300 hover:text-white  flex-shrink-0 group',
          title: isCopied ? 'Đã sao chép!' : `Sao chép ${macro.name}`,
          children: isCopied
            ? jsxRuntime.jsx('svg', {
                'aria-hidden': 'true',
                xmlns: 'http://www.w3.org/2000/svg',
                className: 'h-5 w-5 text-green-400',
                fill: 'none',
                viewBox: '0 0 24 24',
                stroke: 'currentColor',
                children: jsxRuntime.jsx('path', {
                  strokeLinecap: 'round',
                  strokeLinejoin: 'round',
                  strokeWidth: '2',
                  d: 'M5 13l4 4L19 7',
                }),
              })
            : jsxRuntime.jsx('svg', {
                'aria-hidden': 'true',
                xmlns: 'http://www.w3.org/2000/svg',
                className: 'h-5 w-5 group- ',
                fill: 'none',
                viewBox: '0 0 24 24',
                stroke: 'currentColor',
                children: jsxRuntime.jsx('path', {
                  strokeLinecap: 'round',
                  strokeLinejoin: 'round',
                  strokeWidth: '2',
                  d: 'M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
                }),
              }),
        }),
      ],
    });
  };
}

export function createTextInput(getDependencies) {
  return function TextInput({
    label,
    value,
    onChange,
    type = 'text',
    tooltip,
    placeholder,
    className = '',
    disabled = false,
  }) {
    const {
      react,
      Tooltip,
      CopyButton,
      jsxRuntime,
    } = resolveInputControlDeps(getDependencies);

    const inputId = react.useId();

    return jsxRuntime.jsxs('div', {
      className,
      children: [
        jsxRuntime.jsx(Tooltip, {
          text: tooltip,
          children: jsxRuntime.jsx('label', {
            htmlFor: inputId,
            className: 'block text-sm font-medium text-slate-300 mb-1 cursor-help',
            children: label,
          }),
        }),
        jsxRuntime.jsxs('div', {
          className: 'relative',
          children: [
            jsxRuntime.jsx('input', {
              id: inputId,
              type,
              value,
              onChange,
              placeholder,
              disabled,
              className: 'w-full bg-slate-700 border border-slate-600 rounded-md p-2 pr-10 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition disabled:opacity-50 disabled:cursor-not-allowed',
            }),
            value !== '' && jsxRuntime.jsx(CopyButton, {
              textToCopy: String(value),
              absolute: true,
            }),
          ],
        }),
      ],
    });
  };
}

export function createTextArea(getDependencies) {
  return function TextArea({
    label,
    ariaLabel,
    value,
    onChange,
    rows = 3,
    className = '',
    containerClassName = '',
    tooltip,
    placeholder,
  }) {
    const {
      react,
      Tooltip,
      CopyButton,
      jsxRuntime,
    } = resolveInputControlDeps(getDependencies);

    const textareaId = react.useId();

    return jsxRuntime.jsxs('div', {
      className: containerClassName,
      children: [
        jsxRuntime.jsx(Tooltip, {
          text: tooltip,
          children: label && jsxRuntime.jsx('label', {
            htmlFor: textareaId,
            className: 'block text-sm font-medium text-slate-300 mb-1 cursor-help',
            children: label,
          }),
        }),
        jsxRuntime.jsxs('div', {
          className: 'relative',
          children: [
            jsxRuntime.jsx('textarea', {
              id: textareaId,
              value,
              onChange,
              rows,
              placeholder,
              'aria-label': ariaLabel || undefined,
              className: `w-full bg-slate-700 border border-slate-600 rounded-md p-2 pr-10 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition font-mono text-sm ${className}`,
            }),
            jsxRuntime.jsx(CopyButton, {
              textToCopy: value,
              absolute: true,
            }),
          ],
        }),
      ],
    });
  };
}

export function createSearchableSelect(getDependencies) {
  return function SearchableSelect({
    label,
    ariaLabel,
    value,
    onChange,
    options,
    tooltip,
    className = '',
    disabled = false,
    placeholder,
    testButton,
  }) {
    const {
      react,
      Tooltip,
      jsxRuntime,
    } = resolveInputControlDeps(getDependencies);

    const selectId = react.useId();

    return jsxRuntime.jsxs('div', {
      className,
      children: [
        jsxRuntime.jsx(Tooltip, {
          text: tooltip,
          children: label && jsxRuntime.jsx('label', {
            htmlFor: selectId,
            className: 'block text-sm font-medium text-slate-300 mb-1 cursor-help',
            children: label,
          }),
        }),
        jsxRuntime.jsxs('select', {
          id: selectId,
          value,
          onChange,
          disabled,
          className: 'w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition disabled:opacity-50 disabled:cursor-not-allowed',
          'aria-label': ariaLabel || label,
          'aria-description': tooltip,
          children: [
            placeholder && jsxRuntime.jsx('option', {
              value: '',
              children: placeholder,
            }),
            options.map((option, index) => jsxRuntime.jsx('option', {
              value: option.value,
              children: option.label,
            }, `${option.value}-${index}`)),
          ],
        }),
        ...(testButton ? [testButton] : []),
      ],
    });
  };
}

export function createNumberInput(getDependencies) {
  return function NumberInput({
    label,
    value,
    onChange,
    min,
    max,
    step,
    tooltip,
    className = '',
  }) {
    const {
      react,
      Tooltip,
      jsxRuntime,
    } = resolveInputControlDeps(getDependencies);

    const rangeId = react.useId();
    const numericValue = typeof value === 'number' ? value : (Number.parseFloat(value) || min);

    return jsxRuntime.jsxs('div', {
      className,
      children: [
        jsxRuntime.jsx(Tooltip, {
          text: tooltip,
          children: jsxRuntime.jsx('label', {
            htmlFor: rangeId,
            className: 'block text-sm font-medium text-slate-300 mb-1 cursor-help',
            children: label,
          }),
        }),
        jsxRuntime.jsxs('div', {
          className: 'flex items-center gap-4',
          children: [
            jsxRuntime.jsx('input', {
              id: rangeId,
              type: 'range',
              min,
              max,
              step,
              value: numericValue,
              onChange: event => onChange(Number.parseFloat(event.target.value)),
              className: 'w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500',
            }),
            jsxRuntime.jsx('input', {
              type: 'number',
              value,
              onChange: event => {
                const parsed = Number.parseFloat(event.target.value);
                if (!Number.isNaN(parsed)) {
                  onChange(parsed);
                }
              },
              className: 'w-20 bg-slate-700 border border-slate-600 rounded-md p-1 text-slate-200 text-center focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition font-mono text-sm',
              'aria-label': `${label} (Nhập số)`,
            }),
          ],
        }),
      ],
    });
  };
}

export function createStringListInput(getDependencies) {
  return function StringListInput({
    label,
    values = [],
    onChange,
    tooltipText,
    placeholder,
  }) {
    const {
      Tooltip,
      CopyButton,
      jsxRuntime,
    } = resolveInputControlDeps(getDependencies);

    const handleRemoveItem = targetIndex => {
      onChange(values.filter((_item, index) => index !== targetIndex));
    };

    const handleUpdateItem = (targetIndex, nextValue) => {
      const updated = [...values];
      updated[targetIndex] = nextValue;
      onChange(updated);
    };

    return jsxRuntime.jsxs('div', {
      className: 'space-y-3',
      children: [
        jsxRuntime.jsx(Tooltip, {
          text: tooltipText,
          children: jsxRuntime.jsx('label', {
            className: 'block text-sm font-medium text-slate-300 cursor-help',
            children: label,
          }),
        }),
        jsxRuntime.jsx('div', {
          className: 'space-y-2',
          children: values.map((itemValue, index) => jsxRuntime.jsxs('div', {
            className: 'flex items-center gap-2',
            children: [
              jsxRuntime.jsxs('div', {
                className: 'relative flex-grow',
                children: [
                  jsxRuntime.jsx('input', {
                    type: 'text',
                    value: itemValue,
                    onChange: event => handleUpdateItem(index, event.target.value),
                    className: 'w-full bg-slate-700 border border-slate-600 rounded-md p-2 pr-10 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition',
                    placeholder,
                    'aria-label': `${label} mục ${index + 1}`,
                  }),
                  jsxRuntime.jsx(CopyButton, {
                    textToCopy: itemValue,
                    absolute: true,
                  }),
                ],
              }),
              jsxRuntime.jsx('button', {
                onClick: () => handleRemoveItem(index),
                className: 'text-slate-500 hover:text-red-400  p-2 bg-slate-700 rounded-md hover:bg-slate-600',
                'aria-label': `Xóa dòng số ${index + 1}`,
                children: jsxRuntime.jsx('svg', {
                  'aria-hidden': 'true',
                  xmlns: 'http://www.w3.org/2000/svg',
                  className: 'h-4 w-4',
                  viewBox: '0 0 20 20',
                  fill: 'currentColor',
                  children: jsxRuntime.jsx('path', {
                    fillRule: 'evenodd',
                    d: 'M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z',
                    clipRule: 'evenodd',
                  }),
                }),
              }),
            ],
          }, index)),
        }),
        jsxRuntime.jsxs('button', {
          onClick: () => onChange([...values, '']),
          className: 'w-full mt-2 bg-slate-700 hover:bg-slate-600 text-sky-400 font-semibold py-2 px-4 rounded-lg   flex items-center justify-center gap-2 border border-slate-600 border-dashed',
          children: [
            jsxRuntime.jsx('svg', {
              'aria-hidden': 'true',
              xmlns: 'http://www.w3.org/2000/svg',
              className: 'h-5 w-5',
              viewBox: '0 0 20 20',
              fill: 'currentColor',
              children: jsxRuntime.jsx('path', {
                fillRule: 'evenodd',
                d: 'M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z',
                clipRule: 'evenodd',
              }),
            }),
            jsxRuntime.jsx('span', { children: 'Thêm dòng mới' }),
          ],
        }),
      ],
    });
  };
}

export function createToastItem(getDependencies) {
  return function ToastItem({ toast, onClose }) {
    const { react, Icon, jsxRuntime } = resolveInputControlDeps(getDependencies);

    react.useEffect(() => {
      const dismissTimer = setTimeout(() => {
        onClose(toast.id);
      }, 5000);
      return () => clearTimeout(dismissTimer);
    }, [toast.id, onClose]);

    const isAlertSeverity = toast.type === 'error' || toast.type === 'warning';

    return jsxRuntime.jsxs('div', {
      role: isAlertSeverity ? 'alert' : 'status',
      'aria-live': isAlertSeverity ? 'assertive' : 'polite',
      className: `flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg  border mb-2 min-w-[300px] max-w-md ${getToastContainerTone(toast.type)}`,
      children: [
        jsxRuntime.jsx('div', {
          className: 'flex-shrink-0',
          children: jsxRuntime.jsx(Icon, {
            name: getToastIconName(toast.type),
            className: 'h-5 w-5',
          }),
        }),
        jsxRuntime.jsx('div', {
          className: 'flex-grow text-sm font-medium break-words',
          children: toast.message,
        }),
        jsxRuntime.jsx('button', {
          onClick: () => onClose(toast.id),
          className: 'opacity-70 hover:opacity-100 ml-2',
          'aria-label': 'Đóng thông báo',
          children: jsxRuntime.jsx(Icon, {
            name: 'close',
            className: 'h-4 w-4',
          }),
        }),
      ],
    });
  };
}