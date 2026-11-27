export function createDialogFocusHook(dependencies = {}) {
  let dialogStack = [];
  function useDialogFocus(isOpen, onClose, dialogRef, initialFocusRef) {
    let closeCallbackRef = (0,dependencies.react.useRef)(onClose);
    let previousFocusRef = (0,dependencies.react.useRef)(null);
    closeCallbackRef.current = onClose;
    (0,dependencies.react.useEffect)(() => {
      if (!isOpen) return;
      let dialogToken = {};
      dialogStack.push(dialogToken);
      previousFocusRef.current = document.activeElement;
      let focusTimer = setTimeout(() => {
        (initialFocusRef.current || dialogRef.current?.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))?.focus();
      }, 0);
      let handleKeyDown = event => {
        if (dialogStack[dialogStack.length - 1] !== dialogToken) return;
        if ("Escape" === event.key) return event.preventDefault(), void closeCallbackRef.current();
        if ("Tab" !== event.key || !dialogRef.current) return;
        let focusableElements = [...dialogRef.current.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')];
        if (focusableElements.length === 0) return void event.preventDefault();
        let firstElement = focusableElements[0], lastElement = focusableElements[focusableElements.length - 1];
        event.shiftKey && document.activeElement === firstElement
          ? (lastElement.focus(), event.preventDefault())
          : !event.shiftKey && document.activeElement === lastElement && (firstElement.focus(), event.preventDefault());
      };
      document.addEventListener("keydown", handleKeyDown);
      return () => {
        clearTimeout(focusTimer);
        document.removeEventListener("keydown", handleKeyDown);
        let stackIndex = dialogStack.lastIndexOf(dialogToken);
        if (stackIndex !== -1) dialogStack.splice(stackIndex, 1);
        previousFocusRef.current?.focus();
      };
    }, [isOpen, dialogRef, initialFocusRef]);
  }
  return { useDialogFocus };
}

// Native modal dialogs keep background content out of the accessibility tree.
export function createAnchoredDialog(getDependencies) {
  return function AnchoredDialog({ anchor, label, onClose, children, initialFocusSelector }) {
    const { react, jsxRuntime } = getDependencies();
    const dialogRef = react.useRef(null);
    const closeRef = react.useRef(onClose);
    closeRef.current = onClose;

    react.useEffect(() => {
      const dialog = dialogRef.current;
      const opener = anchor || document.activeElement;
      const position = () => {
        const viewport = window.visualViewport;
        const leftEdge = (viewport?.offsetLeft || 0) + 12;
        const topEdge = (viewport?.offsetTop || 0) + 12;
        const rightEdge = leftEdge + (viewport?.width || window.innerWidth) - 24;
        const bottomEdge = topEdge + (viewport?.height || window.innerHeight) - 24;
        dialog.style.maxHeight = `${bottomEdge - topEdge}px`;
        dialog.style.maxWidth = `${rightEdge - leftEdge}px`;
        const rect = opener?.getBoundingClientRect();
        const width = dialog.offsetWidth;
        const height = dialog.offsetHeight;
        const desiredTop = rect ? rect.bottom + 8 : topEdge;
        const top = desiredTop + height <= bottomEdge
          ? desiredTop
          : (rect?.top || bottomEdge) - height - 8;
        dialog.style.left = `${Math.max(leftEdge, Math.min(rect?.left || leftEdge, rightEdge - width))}px`;
        dialog.style.top = `${Math.max(topEdge, Math.min(top, bottomEdge - height))}px`;
      };

      dialog.showModal();
      position();
      (dialog.querySelector(initialFocusSelector || '[data-dialog-close]'))?.focus({ preventScroll: true });
      window.addEventListener('resize', position);
      window.visualViewport?.addEventListener('resize', position);
      window.visualViewport?.addEventListener('scroll', position);
      return () => {
        window.removeEventListener('resize', position);
        window.visualViewport?.removeEventListener('resize', position);
        window.visualViewport?.removeEventListener('scroll', position);
        dialog.close();
        if (opener?.isConnected) opener.focus({ preventScroll: true });
      };
    }, [anchor, initialFocusSelector]);

    return jsxRuntime.jsxs('dialog', {
      ref: dialogRef,
      'data-sts-anchored-dialog': '',
      'aria-label': label,
      className: 'sts-anchored-dialog',
      onKeyDown: event => {
        if (event.key === 'Escape' || event.key === 'Tab') event.stopPropagation();
      },
      onCancel: event => {
        event.preventDefault();
        closeRef.current();
      },
      onClose: () => closeRef.current(),
      onClick: event => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
          closeRef.current();
        }
      },
      children: [
        jsxRuntime.jsxs('div', {
          className: 'sts-anchored-dialog__header',
          children: [
            jsxRuntime.jsx('span', { 'aria-hidden': 'true', children: label }),
            jsxRuntime.jsx('button', {
              type: 'button',
              'data-dialog-close': '',
              onClick: () => closeRef.current(),
              children: 'Đóng',
            }),
          ],
        }),
        children,
      ],
    });
  };
}

export function createChoiceSelect(getDependencies) {
  const ChoiceDialog = createAnchoredDialog(getDependencies);
  return function ChoiceSelect({
    id,
    ref,
    label,
    'aria-label': ariaLabel,
    value,
    onChange,
    options,
    children,
    disabled,
    className,
    tooltip,
    placeholder,
  }) {
    const { react, jsxRuntime } = getDependencies();
    const [anchor, setAnchor] = react.useState(null);
    const searchRef = react.useRef({ text: '', time: 0 });
    const choices = options || react.Children.toArray(children).map(option => ({
      value: option.props.value,
      label: react.Children.toArray(option.props.children).join(''),
      disabled: option.props.disabled,
    }));
    const controlLabel = label || ariaLabel || 'Chọn';
    const selected = choices.find(option => String(option.value) === String(value));
    const displayValue = selected?.label || placeholder || 'Chọn';
    const close = () => setAnchor(null);

    const navigateChoices = event => {
      const buttons = [...event.currentTarget.querySelectorAll('button:not([disabled])')];
      const index = buttons.indexOf(event.target);
      let next;
      switch (event.key) {
        case 'ArrowDown': next = buttons[(index + 1) % buttons.length]; break;
        case 'ArrowUp': next = buttons[(index - 1 + buttons.length) % buttons.length]; break;
        case 'Home': next = buttons[0]; break;
        case 'End': next = buttons[buttons.length - 1]; break;
        default:
          if (event.key.length !== 1 || event.ctrlKey || event.altKey || event.metaKey) return;
          const now = Date.now();
          const search = searchRef.current;
          search.text = (now - search.time < 700 ? search.text : '') + event.key.toLocaleLowerCase();
          search.time = now;
          next = buttons.find(button => button.textContent.toLocaleLowerCase().startsWith(search.text));
      }
      if (next) {
        event.preventDefault();
        next.focus();
      }
    };

    return jsxRuntime.jsxs(jsxRuntime.Fragment, {
      children: [
        jsxRuntime.jsx('button', {
          id,
          ref,
          type: 'button',
          disabled,
          className,
          'aria-label': `${controlLabel}: ${displayValue}`,
          'aria-description': tooltip || undefined,
          'aria-haspopup': 'dialog',
          'aria-expanded': Boolean(anchor),
          onClick: event => setAnchor(event.currentTarget),
          children: jsxRuntime.jsx('span', { 'aria-hidden': 'true', children: displayValue }),
        }),
        anchor && jsxRuntime.jsx(ChoiceDialog, {
          anchor,
          label: controlLabel,
          onClose: close,
          initialFocusSelector: '[aria-pressed="true"]',
          children: jsxRuntime.jsx('div', {
            onKeyDown: navigateChoices,
            children: choices.map((option, index) => jsxRuntime.jsx('button', {
              type: 'button',
              disabled: option.disabled,
              'aria-pressed': String(option.value) === String(value),
              className: 'block w-full text-left px-4 py-3 text-sm hover:bg-slate-800',
              onClick: () => {
                close();
                const target = { value: String(option.value) };
                onChange({ target, currentTarget: target });
              },
              children: option.label,
            }, `${option.value}-${index}`)),
          }),
        }),
      ],
    });
  };
}
