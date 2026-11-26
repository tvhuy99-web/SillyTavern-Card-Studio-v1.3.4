// Application lifecycle owner: ErrorBoundary, global error hunters, and InitialLoader.
// Dependency getters preserve late binding with the host.
export function createApplicationLifecycle(dependencies = {}) {
  class ErrorBoundary extends dependencies.react.Component {
    state = { hasError: false, error: null };

    static getDerivedStateFromError(error) {
      return { hasError: true, error };
    }

    componentDidCatch(error, info) {
      try {
        (0, dependencies.dispatchSystemLog)(
          'error',
          'system',
          `React Render Crash: ${error.message}`,
          info?.componentStack || undefined,
        );
      } catch (logError) {
        console.error('Không thể gửi log hệ thống từ ErrorBoundary', logError);
      }
      console.error('Uncaught error in React Tree:', error, info);
    }

    render() {
      if (!this.state.hasError) {
        return this.props.children || null;
      }
      return (0, dependencies.jsxRuntime.jsx)('div', {
        role: 'alert',
        className: 'min-h-screen flex items-center justify-center bg-slate-900 text-slate-200 p-6',
        children: (0, dependencies.jsxRuntime.jsxs)('div', {
          className: 'max-w-md w-full bg-slate-800 border border-red-500/50 rounded-xl p-6 shadow-2xl',
          children: [
            (0, dependencies.jsxRuntime.jsxs)('div', {
              className: 'flex items-center gap-3 text-red-400 mb-4',
              children: [
                (0, dependencies.jsxRuntime.jsx)('svg', {
                  xmlns: 'http://www.w3.org/2000/svg',
                  className: 'h-8 w-8',
                  fill: 'none',
                  viewBox: '0 0 24 24',
                  stroke: 'currentColor',
                  'aria-hidden': 'true',
                  children: (0, dependencies.jsxRuntime.jsx)('path', {
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round',
                    strokeWidth: '2',
                    d: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
                  }),
                }),
                (0, dependencies.jsxRuntime.jsx)('h2', {
                  className: 'text-xl font-bold',
                  children: 'Hệ thống đã gặp sự cố',
                }),
              ],
            }),
            (0, dependencies.jsxRuntime.jsx)('p', {
              className: 'text-slate-400 mb-4 text-sm',
              children: 'Một lỗi nghiêm trọng đã xảy ra trong quá trình hiển thị giao diện. Lỗi này đã được ghi lại vào Bảng điều khiển Hệ thống.',
            }),
            (0, dependencies.jsxRuntime.jsx)('div', {
              className: 'bg-slate-950 p-3 rounded border border-slate-700 mb-6 overflow-auto max-h-32',
              children: (0, dependencies.jsxRuntime.jsx)('code', {
                className: 'text-xs font-mono text-red-300',
                children: this.state.error?.message || 'Unknown Error',
              }),
            }),
            (0, dependencies.jsxRuntime.jsx)('button', {
              className: 'w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-lg ',
              onClick: () => window.location.reload(),
              children: 'Tải lại trang',
            }),
          ],
        }),
      });
    }
  }

  function formatSystemDiagnosticReport(details) {
    return [
      'BÁO CÁO CHẨN ĐOÁN HỆ THỐNG',
      '',
      `Mã lỗi: ${details.code}`,
      `Giai đoạn: ${details.phase}`,
      `Thành phần: ${details.component}`,
      ...(details.location ? [`Vị trí: ${details.location}`] : []),
      `Thời gian: ${new Date().toLocaleString()}`,
      '',
      'NGUYÊN NHÂN',
      details.message,
      '',
      'GỢI Ý SỬA',
      details.suggestion,
    ].join('\n');
  }

  let errorHuntersInstalled = false;
  let isForwardingConsole = false;

  if (!errorHuntersInstalled && typeof window !== 'undefined') {
    errorHuntersInstalled = true;

    window.onerror = (message, source, line, column, error) => {
      const stack = error?.stack || `${source}:${line}:${column}`;
      (0, dependencies.dispatchSystemLog)(
        'error',
        'diagnostic',
        formatSystemDiagnosticReport({
          code: 'APP_RUNTIME_UNCAUGHT',
          phase: 'runtime',
          component: 'window.onerror',
          message: String(message),
          location: source ? `${source}:${line}:${column}` : undefined,
          suggestion: 'Gửi báo cáo này cùng stack trace. Dòng đầu tiên thuộc mã ứng dụng thường là vị trí cần sửa trước.',
        }),
        stack,
      );
      return false;
    };

    window.onunhandledrejection = event => {
      let stack;
      const reason = event.reason;
      let message = 'Unknown Async Error';
      if (reason instanceof Error) {
        message = reason.message;
        stack = reason.stack;
      } else if (typeof reason === 'string') {
        message = reason;
      } else {
        try {
          message = JSON.stringify(reason);
        } catch {
          message = String(reason);
        }
      }
      (0, dependencies.dispatchSystemLog)(
        'error',
        'diagnostic',
        formatSystemDiagnosticReport({
          code: 'APP_ASYNC_UNHANDLED_REJECTION',
          phase: 'async-runtime',
          component: 'window.onunhandledrejection',
          message,
          suggestion: 'Kiểm tra promise bị từ chối mà không có catch. Stack trace sẽ chỉ ra tác vụ bất đồng bộ gây lỗi khi có thể.',
        }),
        stack,
      );
    };

    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    console.error = (...args) => {
      originalConsoleError.apply(console, args);
      if (isForwardingConsole) return;
      try {
        isForwardingConsole = true;
        const formatted = args.map(arg => {
          if (typeof arg === 'string') return arg;
          if (arg instanceof Error) return arg.message;
          try {
            return JSON.stringify(arg);
          } catch {
            return String(arg);
          }
        }).join(' ');
        const errorArg = args.find(arg => arg instanceof Error);
        (0, dependencies.dispatchSystemLog)('error', 'console', formatted, errorArg ? errorArg.stack : undefined);
      } catch {
        // Ignore forwarding errors.
      } finally {
        isForwardingConsole = false;
      }
    };

    console.warn = (...args) => {
      originalConsoleWarn.apply(console, args);
      if (isForwardingConsole) return;
      try {
        isForwardingConsole = true;
        const formatted = args.map(arg => (typeof arg === 'object' ? JSON.stringify(arg) : String(arg))).join(' ');
        (0, dependencies.dispatchSystemLog)('warn', 'console', formatted);
      } catch {
        // Ignore forwarding errors.
      } finally {
        isForwardingConsole = false;
      }
    };

    if (typeof window.addEventListener === 'function') {
      window.addEventListener(
        'error',
        event => {
          const target = event?.target;
          if (
            target &&
            (target.tagName === 'IMG' ||
              target.tagName === 'SCRIPT' ||
              target.tagName === 'LINK' ||
              target.tagName === 'AUDIO' ||
              target.tagName === 'VIDEO')
          ) {
            const url = target.src || target.href || 'unknown source';
            const tagName = target.tagName.toLowerCase();
            (0, dependencies.dispatchSystemLog)(
              'error',
              'diagnostic',
              formatSystemDiagnosticReport({
                code: 'APP_RESOURCE_LOAD_FAILED',
                phase: 'resource-load',
                component: tagName,
                message: `Không thể tải tài nguyên <${tagName}> từ '${url}'.`,
                location: url,
                suggestion: 'Kiểm tra URL, kết nối mạng, CORS và xem tài nguyên có còn tồn tại hay không.',
              }),
            );
          }
        },
        true,
      );
    }

    console.log('[System] Global Error Hunters (Multi-layer) initialized.');
  }

  function InitialLoader() {
    const {
      reloadCharacters,
      characters,
      updateActiveCharacter,
      activeCharacterFileName,
      isLoading: charactersLoading,
    } = (0, dependencies.characterStore)();
    const {
      reloadLorebooks,
      lorebooks,
      isLoading: lorebooksLoading,
    } = (0, dependencies.lorebookStore)();
    const { reloadPersonas } = (0, dependencies.personaStore)();
    const { reloadPresets } = (0, dependencies.presetStore)();

    let toastApi = null;
    if (typeof dependencies.useToast === 'function') {
      try {
        toastApi = dependencies.useToast();
      } catch {
        toastApi = null;
      }
    }

    (0, dependencies.react.useEffect)(() => {
      reloadCharacters();
      reloadLorebooks();
      reloadPersonas();
      reloadPresets();
    }, [reloadCharacters, reloadLorebooks, reloadPersonas, reloadPresets]);

    (0, dependencies.react.useEffect)(() => {
      const pending = dependencies.__stsBackupRestoreService?.getPendingRecovery?.();
      if (!pending) return;

      const warningMessage =
        `Phát hiện nhật ký khôi phục chưa hoàn tất (journal: ${pending.id || 'unknown'}, trạng thái: ${pending.status || 'pending'}). ` +
        'IndexedDB và Web Storage là hai kho lưu trữ tách biệt (không atomic xuyên storage); ' +
        'hãy mở Cài đặt → Sao lưu & Khôi phục để thử áp dụng lại cài đặt hoặc hoàn tác IndexedDB.';

      try {
        dependencies.dispatchSystemLog?.('warn', 'persistence', warningMessage, undefined, {
          journalId: pending.id || null,
          status: pending.status || null,
          idbCommitted: Boolean(pending.idbCommitted),
          settingsApplied: Boolean(pending.settingsApplied),
          atomicAcrossStorages: false,
        });
      } catch {
        // Diagnostics logging must not block startup.
      }

      if (typeof dependencies.onPendingRecovery === 'function') {
        try {
          dependencies.onPendingRecovery(pending, warningMessage);
        } catch {
          // Callback errors must not block startup.
        }
      }

      if (typeof toastApi?.showToast === 'function') {
        try {
          toastApi.showToast(warningMessage, 'warning');
        } catch {
          // Toast notification is optional during startup.
        }
      }
    }, []);

    (0, dependencies.react.useEffect)(() => {
      if (charactersLoading || lorebooksLoading) return;
      const availableLorebooks = new Set(lorebooks.map(book => book.name));
      characters.forEach(character => {
        const attached = character.card.attached_lorebooks || [];
        if (attached.length > 0) {
          const remaining = attached.filter(name => availableLorebooks.has(name));
          if (remaining.length < attached.length && character.fileName === activeCharacterFileName) {
            const nextCard = {
              ...character.card,
              attached_lorebooks: remaining.length > 0 ? remaining : undefined,
            };
            updateActiveCharacter(nextCard);
          }
        }
      });
    }, [characters, charactersLoading, lorebooks, lorebooksLoading, activeCharacterFileName, updateActiveCharacter]);

    return null;
  }

  return { ErrorBoundary, InitialLoader };
}
