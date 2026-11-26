// Shared form controls recovered from the host. The temporary factory boundary
// ensures hooks and elements use the host's existing React instance.
export function createTableCellInput({ jsx }) {
  return function TableCellInput({ value, onSave, column }) {
    return jsx('input', {
      value: value ?? '',
      type: column?.type === 'number' ? 'number' : 'text',
      'aria-label': column?.label || column?.id || 'Giá trị ô',
      className: 'w-full bg-slate-800 border border-slate-600 rounded px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500',
      onChange: event => onSave(event.target.value),
    });
  };
}

export function createModelSelect({ jsx, jsxs }, { useMemo }) {
  return function ModelSelect({ label, value, onChange, options, provider, testButton }) {
    const isKnownModel = useMemo(() => options.some(option => option.id === value), [value, options]);
    return jsxs('div', {
      'data-sts-provider': provider,
      className: 'bg-slate-900/50 p-4 rounded-lg border border-slate-700',
      children: [
        jsx('label', { className: 'block text-sm font-bold text-indigo-300 mb-2', children: label }),
        jsxs('select', {
          'aria-label': label,
          value: isKnownModel ? value : 'custom_option',
          onChange: event => onChange(event.target.value === 'custom_option' ? '' : event.target.value),
          className: 'w-full bg-slate-800 border border-slate-600 rounded p-2 text-white mb-2',
          children: [
            options.map(option => jsx('option', { value: option.id, children: option.name }, option.id)),
            jsx('option', { value: 'custom_option', children: 'Khác (Tự nhập Model ID)' }),
          ],
        }),
        ...(testButton ? [testButton] : []),
        (!isKnownModel || value === '') && jsx('div', {
          className: '',
          children: jsx('input', {
            'aria-label': `${label} tùy chỉnh`, type: 'text', value,
            onChange: event => onChange(event.target.value),
            className: 'w-full bg-slate-800 border border-slate-500 rounded p-2 text-white font-mono text-sm focus:ring-1 focus:ring-indigo-500',
            placeholder: 'Nhập Model ID...', autoFocus: true,
          }),
        }),
      ],
    });
  };
}

export function createToggleSwitch({ jsx, jsxs }, { useId }, Tooltip) {
  return function ToggleSwitch({ label, ariaLabel, checked, onChange, tooltip, disabled, className = '', clean = false }) {
    // Keep the existing hook order while the host is being migrated.
    useId();
    return jsxs('button', {
      type: 'button', disabled,
      className: `${clean ? 'flex items-center justify-between' : 'flex items-center justify-between bg-slate-700/50 p-3 rounded-lg'} ${className} cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
      role: 'switch', 'aria-checked': checked, 'aria-label': ariaLabel || label || undefined,
      'aria-description': tooltip,
      onClick: event => { event.stopPropagation(); if (!disabled) onChange(!checked); },
      children: [
        jsx('div', {
          className: 'flex-grow mr-3', 'aria-hidden': 'true',
          children: jsx(Tooltip, { text: tooltip, children: label && jsx('span', {
            className: 'text-sm font-medium ' + (disabled ? 'text-slate-500' : 'text-slate-300'), children: label,
          }) }),
        }),
        jsx('div', {
          className: (checked ? 'bg-sky-500' : 'bg-slate-600') + ' relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors ease-in-out',
          'aria-hidden': 'true',
          children: jsx('span', { className: (checked ? 'translate-x-4' : 'translate-x-0') + ' inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition-transform ease-in-out' }),
        }),
      ],
    });
  };
}
