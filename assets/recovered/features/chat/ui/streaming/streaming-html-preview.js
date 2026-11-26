const PREVIEW_BASE_STYLES = [
  '',
  '            html,body{margin:0;padding:0;min-width:0;background:transparent;color:#e2e8f0;font-family:system-ui,sans-serif;overflow-x:hidden}',
  '            *{box-sizing:border-box} img,video,canvas,svg{max-width:100%;height:auto}',
  '            button,input,select,textarea,a,[tabindex]{outline-offset:3px}',
  '            button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,a:focus-visible,[tabindex]:focus-visible{outline:2px solid currentColor}',
  '        ',
].join('\n');

function buildSanitizedPreviewHtml(rawHtml) {
  try {
    const parsedDoc = new DOMParser().parseFromString(rawHtml, 'text/html');
    parsedDoc.querySelectorAll('script').forEach(node => node.remove());
    parsedDoc.querySelectorAll('[autofocus]').forEach(node => node.removeAttribute('autofocus'));
    parsedDoc.querySelectorAll('[onclick]').forEach(node => node.removeAttribute('onclick'));
    const styleEl = parsedDoc.createElement('style');
    styleEl.textContent = PREVIEW_BASE_STYLES;
    parsedDoc.head.appendChild(styleEl);
    return `<!doctype html>${parsedDoc.documentElement.outerHTML}`;
  } catch (error) {
    const safeError = (error instanceof Error ? error.message : String(error)).replace(/[<>&]/g, '');
    return `<!doctype html><html><body><p>Đang nhận giao diện HTML…</p><pre>${safeError}</pre></body></html>`;
  }
}

export function createStreamingHtmlPreview(getDependencies) {
  return function StreamingHtmlPreview({ htmlContent, characterName }) {
    const { react, jsxRuntime } = getDependencies();
    const sanitizedSrcDoc = react.useMemo(
      () => buildSanitizedPreviewHtml(htmlContent),
      [htmlContent],
    );

    return jsxRuntime.jsxs('div', {
      className: 'border border-slate-700/50 rounded-lg overflow-hidden bg-slate-900/30',
      children: [
        jsxRuntime.jsx('div', {
          className: 'px-3 py-1.5 text-xs text-slate-400 border-b border-slate-700/50',
          'aria-live': 'polite',
          children: 'Đang dựng trước giao diện HTML. Script tương tác sẽ chỉ khởi chạy sau khi phản hồi hoàn tất.',
        }),
        jsxRuntime.jsx('iframe', {
          srcDoc: sanitizedSrcDoc,
          title: `Bản xem trước HTML đang tạo của ${characterName}`,
          sandbox: 'allow-forms',
          className: 'w-full border-0 bg-transparent',
          style: { minHeight: 280, height: 520 },
        }),
      ],
    });
  };
}
