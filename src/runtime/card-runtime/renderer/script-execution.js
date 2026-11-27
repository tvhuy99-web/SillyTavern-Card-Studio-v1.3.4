// Classic iframe source fragment; evaluated in the same lexical scope and original sequence.
export function renderScriptExecution() {
  return String.raw`    async function runScript(info) {
        window.__setActiveCardScript(info.id, info.name, info.info, info.buttons);
        let scriptContent = String(info.content || '');
        try {
            if (scriptContent.indexOf('{{') >= 0 && typeof window.substitudeMacros === 'function') scriptContent = window.substitudeMacros(scriptContent);
        } catch (error) {
            window._cardStudio.diagnostic('CARD_RUNTIME_SCRIPT_FAILED', 'macro-render', 'macro-engine', 'Không thể thay thế macro trong script: ' + error.message, { stack: error.stack, scriptId: info.id, scriptName: info.name });
        }
        if (window.ejs && typeof window.ejs.render === 'function' && /<%[=-]?/.test(scriptContent)) {
            try {
                scriptContent = await window.ejs.render(scriptContent, { getvar: window.getvar, getwi: window.getwi, toastr: window.toastr, stat_data: window.stat_data }, { async: true });
            } catch (error) {
                window._cardStudio.log('script-error', 'EJS script rendering failed: ' + (info.name || info.id), { stack: error.stack });
                window._cardStudio.diagnostic('CARD_RUNTIME_EJS_RENDER_FAILED', 'script-render', 'EJS', 'EJS script rendering failed: ' + (info.name || info.id), { stack: error.stack, scriptId: info.id, scriptName: info.name });
                return;
            }
        }
        return new Promise(function (resolve) {
            const element = document.createElement('script');
            if (info.type === 'module') element.type = 'module';
            if (info.noModule) element.noModule = true;
            if (info.crossOrigin) element.crossOrigin = info.crossOrigin;
            if (info.integrity) element.integrity = info.integrity;
            if (info.referrerPolicy) element.referrerPolicy = info.referrerPolicy;
            if (info.src) element.src = window.resolveCardAsset(info.src);
            else element.textContent = scriptContent + '\n//# sourceURL=card-runtime-' + encodeURIComponent(info.name || info.id) + '.js';
            let finished = false;
            const finish = function (error) {
                if (finished) return;
                finished = true;
                if (error) {
                    const message = 'Card script failed: ' + (info.name || info.id);
                    window._cardStudio.log('script-error', message, { src: info.src || null, scriptId: info.id });
                    window._cardStudio.diagnostic('CARD_RUNTIME_SCRIPT_FAILED', 'script-execution', 'script-loader', message, { resourceUrl: info.src || undefined, scriptId: info.id, scriptName: info.name });
                }
                resolve();
            };
            element.onload = function () { finish(); };
            element.onerror = function () { finish(true); };
            document.body.appendChild(element);
            if (!info.src && info.type !== 'module') finish();
            else setTimeout(function () { finish(); }, 30000);
        });
    }

    if (START_OPTIONS.executeScripts) {
        const deferred = [];
        const asyncTasks = [];
        for (const descriptor of descriptors) {
            if (descriptor.async) {
                asyncTasks.push(runScript(descriptor));
            } else if (descriptor.defer || descriptor.type === 'module') {
                deferred.push(descriptor);
            } else {
                await runScript(descriptor);
            }
        }
        for (const descriptor of deferred) await runScript(descriptor);
        Promise.allSettled(asyncTasks).then(function () { reportVariableReadinessIfNeeded('post-async-scripts'); });
    }
    reportVariableReadinessIfNeeded('post-sync-scripts');
    setTimeout(function () { reportVariableReadinessIfNeeded('post-script-settle-250ms'); }, 250);
    setTimeout(function () { reportVariableReadinessIfNeeded('post-script-settle-1200ms'); }, 1200);

`;
}
