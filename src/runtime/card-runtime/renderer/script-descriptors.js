// Classic iframe source fragment; evaluated in the same lexical scope and original sequence.
export function renderScriptDescriptors(descriptorsJson) {
  return String.raw`    const dynamicDescriptors = [];
    Array.from(target.querySelectorAll('script')).forEach(function (script, index) {
        const type = String(script.type || '').toLowerCase();
        if (type === 'importmap' || type === 'importmap-shim') {
            try {
                const importMap = document.createElement('script');
                importMap.type = type;
                importMap.textContent = script.textContent || '';
                document.head.appendChild(importMap);
            } catch (error) {
                window._cardStudio.diagnostic('CARD_RUNTIME_IMPORTMAP_INVALID', 'script-prepare', 'importmap', 'Không thể cài import map được render: ' + error.message, { stack: error.stack });
            }
            script.remove();
            return;
        }
        if (type && !['module', 'text/javascript', 'application/javascript', 'text/ecmascript', 'application/ecmascript'].includes(type)) return;
        dynamicDescriptors.push({
            id: script.id || 'rendered-script-' + index,
            name: 'Rendered HTML script ' + (index + 1),
            type: type === 'module' ? 'module' : 'classic',
            src: script.getAttribute('src') || undefined,
            content: script.textContent || '',
            async: script.hasAttribute('async'),
            defer: script.hasAttribute('defer'),
            noModule: script.noModule,
            crossOrigin: script.crossOrigin || undefined,
            integrity: script.integrity || undefined,
            referrerPolicy: script.referrerPolicy || undefined
        });
        script.remove();
    });
    const descriptors = dynamicDescriptors.concat(${descriptorsJson});
    if (typeof window.__registerCardRuntimeScripts === 'function') window.__registerCardRuntimeScripts(descriptors);

`;
}
