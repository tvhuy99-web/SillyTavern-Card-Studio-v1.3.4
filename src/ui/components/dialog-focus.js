// Recovered from the application host. One owner; dependency getters preserve late binding.
export function createDialogFocusHook(dependencies = {}) {
  let dialogStack = [];
  function useDialogFocus(isOpen, onClose, dialogRef, initialFocusRef) {
    let closeCallbackRef = (0,dependencies.b.useRef)(onClose);
    let previousFocusRef = (0,dependencies.b.useRef)(null);
    closeCallbackRef.current = onClose;
    (0,dependencies.b.useEffect)(() => {
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
