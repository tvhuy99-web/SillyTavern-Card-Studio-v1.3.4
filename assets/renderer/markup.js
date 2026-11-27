export function renderMarkup(htmlJson) {
  return String.raw`    const target = window._cardStudio?.engineMode === 'official-local'
        ? document.body
        : document.getElementById('target_mes_text') || document.getElementById('chat') || document.body;
    let html = ${htmlJson};
    try {
        if (typeof window.substitudeMacros === 'function') html = window.substitudeMacros(html);
    } catch (error) {
        window._cardStudio.diagnostic('CARD_RUNTIME_SCRIPT_FAILED', 'macro-render', 'macro-engine', 'Không thể thay thế macro trong HTML: ' + error.message, { stack: error.stack });
    }
    try {
        if (window.ejs && typeof window.ejs.render === 'function' && /<%[=-]?/.test(html)) {
            html = await window.ejs.render(html, { getvar: window.getvar, getwi: window.getwi, toastr: window.toastr, stat_data: window.stat_data }, { async: true });
        }
    } catch (error) {
        window._cardStudio.log('error', 'EJS rendering failed: ' + error.message, { stack: error.stack });
        window._cardStudio.diagnostic('CARD_RUNTIME_EJS_RENDER_FAILED', 'render', 'EJS', 'EJS rendering failed: ' + error.message, { stack: error.stack });
    }

    try {
        target.innerHTML = html;
    } catch (error) {
        window._cardStudio.diagnostic('CARD_RUNTIME_RENDER_FAILED', 'render', 'DOM', 'Không thể gắn HTML của thẻ vào DOM: ' + error.message, { stack: error.stack });
        target.textContent = 'Không thể hiển thị giao diện HTML. Hãy mở Bảng Gỡ Lỗi để xem mã chẩn đoán.';
    }

`;
}
