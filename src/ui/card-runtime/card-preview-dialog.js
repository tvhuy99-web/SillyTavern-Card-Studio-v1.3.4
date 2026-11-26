import { isFrameMessageOrigin, postFrameMessage } from '../../runtime/card-runtime/host/rpc-dispatcher.js';

export function createCardPreviewDialog(react, getDependencies) {
  return react.forwardRef(function CardPreviewDialog({
    isOpen,
    onClose,
    htmlContent,
    characterName,
    messageId,
  }, forwardedRef) {
    const {
      react: reactRuntime,
      Icon,
      jsxRuntime,
    } = getDependencies();

    const [isMinimized, setIsMinimized] = reactRuntime.useState(false);
    const [mirroredHtml, setMirroredHtml] = reactRuntime.useState('');
    const [syncStatus, setSyncStatus] = reactRuntime.useState('connecting');

    const fallbackSafeHtml = reactRuntime.useMemo(() => {
      try {
        const parsedDoc = new DOMParser().parseFromString(
          htmlContent || '<div>Không có nội dung HUD.</div>',
          'text/html',
        );
        parsedDoc.querySelectorAll('script').forEach(node => node.remove());
        parsedDoc.querySelectorAll('[autofocus]').forEach(node => node.removeAttribute('autofocus'));
        return `<!doctype html>${parsedDoc.documentElement.outerHTML}`;
      } catch {
        return '<!doctype html><html><head><meta charset="utf-8"></head><body>Không thể tạo bản xem HUD an toàn.</body></html>';
      }
    }, [htmlContent]);

    reactRuntime.useEffect(() => {
      if (!isOpen) {
        return;
      }

      let sourceIframe = null;
      let pollTimerId = 0;
      let cancelled = false;

      const handleMirrorSnapshot = event => {
        if (
          !sourceIframe?.contentWindow
          || event.source !== sourceIframe.contentWindow
          || !isFrameMessageOrigin(sourceIframe, event.origin, window.location.origin)
          || event.data?.type !== 'CARD_RUNTIME_MIRROR_SNAPSHOT'
        ) {
          return;
        }
        const payload = event.data.payload;
        if (messageId !== undefined && Number(payload?.messageId) !== Number(messageId)) {
          return;
        }
        const snapshotHtml = String(payload?.html || '');
        if (snapshotHtml) {
          setMirroredHtml(snapshotHtml);
          setSyncStatus('live');
        }
      };

      const subscribeToActiveFrame = () => {
        if (cancelled) {
          return;
        }
        const selector = messageId === undefined
          ? 'iframe[data-card-studio-iframe="true"][data-card-runtime-active="true"]'
          : `iframe[data-card-studio-iframe="true"][data-card-runtime-active="true"][data-card-message-id="${messageId}"]`;
        const candidateIframe = Array.from(document.querySelectorAll(selector)).at(-1) || null;
        if (candidateIframe?.contentWindow) {
          if (sourceIframe && sourceIframe !== candidateIframe) {
            postFrameMessage(sourceIframe, { type: 'CARD_RUNTIME_MIRROR_UNSUBSCRIBE' });
          }
          sourceIframe = candidateIframe;
          postFrameMessage(candidateIframe, { type: 'CARD_RUNTIME_MIRROR_SUBSCRIBE' });
          return;
        }
        setMirroredHtml(fallbackSafeHtml);
        setSyncStatus('fallback');
      };

      window.addEventListener('message', handleMirrorSnapshot);
      subscribeToActiveFrame();
      pollTimerId = window.setInterval(subscribeToActiveFrame, 1200);

      return () => {
        cancelled = true;
        window.removeEventListener('message', handleMirrorSnapshot);
        window.clearInterval(pollTimerId);
        postFrameMessage(sourceIframe, { type: 'CARD_RUNTIME_MIRROR_UNSUBSCRIBE' });
      };
    }, [isOpen, messageId, fallbackSafeHtml]);

    if (!isOpen) {
      return null;
    }

    if (!htmlContent) {
      return jsxRuntime.jsxs('div', {
        className: 'fixed top-20 right-4 w-80 bg-slate-800/90 border border-red-500/50 rounded-xl p-4 shadow-2xl z-40 text-red-300 text-sm',
        children: [
          jsxRuntime.jsxs('div', {
            className: 'flex justify-between items-center mb-2',
            children: [
              jsxRuntime.jsx('span', { className: 'font-bold', children: 'Lỗi HUD' }),
              jsxRuntime.jsx('button', {
                onClick: onClose,
                'aria-label': 'Đóng thông báo lỗi',
                children: jsxRuntime.jsx(Icon, { name: 'close', className: 'h-4 w-4' }),
              }),
            ],
          }),
          jsxRuntime.jsx('p', {
            children: 'Không tìm thấy nội dung giao diện thẻ HTML trong lịch sử trò chuyện.',
          }),
        ],
      });
    }

    const statusLabel = syncStatus === 'live'
      ? 'Đồng bộ trực tiếp, không chạy lại script'
      : (syncStatus === 'fallback' ? 'Bản xem an toàn' : 'Đang kết nối giao diện gốc');

    return jsxRuntime.jsxs('div', {
      className: `fixed right-4 z-40 ease-in-out flex flex-col shadow-2xl bg-slate-900/80 border border-slate-600/50 rounded-xl overflow-hidden ${
        isMinimized ? 'w-48 h-10 bottom-24' : 'w-[450px] max-w-[90vw] h-[80vh] top-20'
      }`,
      role: 'dialog',
      'aria-label': `HUD trạng thái của ${characterName}`,
      children: [
        jsxRuntime.jsxs('div', {
          className: 'flex items-center justify-between px-3 py-2 bg-slate-800/80 border-b border-slate-700 shrink-0',
          children: [
            jsxRuntime.jsxs('div', {
              className: 'min-w-0',
              children: [
                jsxRuntime.jsxs('span', {
                  className: 'font-bold text-slate-200 text-sm truncate block',
                  children: [characterName, ' - Trạng thái'],
                }),
                !isMinimized && jsxRuntime.jsx('span', {
                  className: 'text-[10px] text-slate-400',
                  children: statusLabel,
                }),
              ],
            }),
            jsxRuntime.jsxs('div', {
              className: 'flex items-center gap-1 shrink-0',
              children: [
                jsxRuntime.jsx('button', {
                  onClick: () => setIsMinimized(!isMinimized),
                  className: 'p-1 text-slate-300 hover:text-white hover:bg-slate-700 rounded',
                  'aria-label': isMinimized ? 'Mở rộng HUD' : 'Thu nhỏ HUD',
                  children: jsxRuntime.jsx(Icon, {
                    name: isMinimized ? 'expand' : 'collapse',
                    className: 'h-4 w-4',
                  }),
                }),
                jsxRuntime.jsx('button', {
                  onClick: onClose,
                  className: 'p-1 text-slate-300 hover:text-red-400 hover:bg-slate-700 rounded',
                  'aria-label': 'Đóng HUD',
                  children: jsxRuntime.jsx(Icon, { name: 'close', className: 'h-4 w-4' }),
                }),
              ],
            }),
          ],
        }),
        !isMinimized && jsxRuntime.jsx('div', {
          className: 'flex-1 min-h-0 overflow-auto relative bg-slate-900/50',
          children: jsxRuntime.jsx('iframe', {
            ref: forwardedRef,
            srcDoc: mirroredHtml || fallbackSafeHtml,
            title: `Bản sao HUD của ${characterName}`,
            sandbox: 'allow-forms allow-pointer-lock',
            className: 'block w-full h-full min-h-full border-0 bg-transparent',
            style: { minHeight: '100%' },
          }),
        }),
      ],
    });
  });
}
