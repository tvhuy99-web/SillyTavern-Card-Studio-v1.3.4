// Classic iframe source fragment; evaluated in the same lexical scope and original sequence.
export function renderVariableReadiness() {
  return String.raw`    function compactVariableSnippet(content, index) {
        const start = Math.max(0, index - 120);
        const end = Math.min(content.length, index + 220);
        return content.slice(start, end).replace(/\s+/g, ' ').trim().slice(0, 360);
    }

    function collectLiteralVariablePaths(content) {
        const found = [];
        const seen = new Set();
        function push(kind, path) {
            const normalized = String(path || '').trim().replace(/^stat_data\./, '');
            if (!normalized) return;
            const key = kind + ':' + normalized;
            if (seen.has(key)) return;
            seen.add(key);
            found.push({ kind: kind, path: normalized.slice(0, 240) });
        }

        let match;
        const getvarPattern = /\bgetvar\s*\(\s*(['"])([^'"]+)\1\s*\)/g;
        while ((match = getvarPattern.exec(content)) !== null) push('getvar', match[2]);

        const statDotPattern = /\b(?:window\s*\.\s*)?stat_data(?:\?\.|\.)([A-Za-z_$\u00C0-\uFFFF][\w$\u00C0-\uFFFF]*(?:(?:\?\.|\.)[A-Za-z_$\u00C0-\uFFFF][\w$\u00C0-\uFFFF]*)*)/g;
        while ((match = statDotPattern.exec(content)) !== null) push('stat_data', match[1].replace(/\?\./g, '.'));

        const statBracketPattern = /\b(?:window\s*\.\s*)?stat_data\s*\[\s*(['"])([^'"]+)\1\s*\]/g;
        while ((match = statBracketPattern.exec(content)) !== null) push('stat_data', match[2]);

        return found.slice(0, 48);
    }

    function buildVariableDependencyProfile(items) {
        const profile = {
            usesVariables: false,
            usesVariableApi: false,
            requiresChatState: false,
            scripts: [],
            literalPaths: [],
            accessSnippets: [],
            readinessTextLiterals: []
        };
        const pathSeen = new Set();
        const snippetSeen = new Set();
        const readinessSeen = new Set();
        items.forEach(function (info) {
            const content = String(info && info.content || '');
            if (!content) return;
            const usesVariableApi = /\b(?:getVariables|getAllVariables|replaceVariables|updateVariablesWith|insertVariables|insertOrAssignVariables|deleteVariable|registerVariableSchema)\b/.test(content);
            const requiresChatState = /\b(?:stat_data|__st_live_data|getvar|setvar)\b/.test(content);
            if (!usesVariableApi && !requiresChatState) return;
            profile.usesVariables = true;
            profile.usesVariableApi = profile.usesVariableApi || usesVariableApi;
            profile.requiresChatState = profile.requiresChatState || requiresChatState;
            const scriptName = String(info.name || info.id || 'script').slice(0, 120);
            profile.scripts.push(scriptName);

            collectLiteralVariablePaths(content).forEach(function (entry) {
                const key = entry.kind + ':' + entry.path;
                if (pathSeen.has(key)) return;
                pathSeen.add(key);
                profile.literalPaths.push(Object.assign({ script: scriptName }, entry));
            });

            const accessPattern = /\b(?:getVariables|getAllVariables|getvar|setvar|stat_data|__st_live_data|registerVariableSchema)\b/g;
            let match;
            while ((match = accessPattern.exec(content)) !== null && profile.accessSnippets.length < 24) {
                const snippet = compactVariableSnippet(content, match.index);
                const key = scriptName + ':' + snippet;
                if (!snippet || snippetSeen.has(key)) continue;
                snippetSeen.add(key);
                profile.accessSnippets.push({ script: scriptName, token: match[0], snippet: snippet });
            }

            const readinessPattern = /(['"])([^\n\r'"]{0,140}(?:Biến\s+chưa\s+sẵn\s+sàng|variables?\s+(?:are\s+)?not\s+ready|waiting\s+for\s+variables?)[^\n\r'"]{0,140})\1/gi;
            while ((match = readinessPattern.exec(content)) !== null && profile.readinessTextLiterals.length < 12) {
                const marker = String(match[2] || '').replace(/\s+/g, ' ').trim().slice(0, 280);
                if (!marker || readinessSeen.has(marker)) continue;
                readinessSeen.add(marker);
                profile.readinessTextLiterals.push({ script: scriptName, text: marker });
            }
        });
        profile.literalPaths = profile.literalPaths.slice(0, 48);
        return profile;
    }

    function readPathState(rootValue, path) {
        const parts = String(path || '').replace(/\[(?:'|")([^'"]+)(?:'|")\]/g, '.$1').split('.').filter(Boolean);
        let current = rootValue;
        const traversed = [];
        for (let index = 0; index < parts.length; index += 1) {
            const part = parts[index];
            traversed.push(part);
            if (current == null || (typeof current !== 'object' && typeof current !== 'function') || !Object.prototype.hasOwnProperty.call(current, part)) {
                return {
                    exists: false,
                    path: String(path || ''),
                    missingSegment: part,
                    resolvedPrefix: traversed.slice(0, -1).join('.'),
                    depth: index
                };
            }
            current = current[part];
        }
        return {
            exists: true,
            path: String(path || ''),
            valueType: current === null ? 'null' : Array.isArray(current) ? 'array' : typeof current,
            depth: parts.length
        };
    }

    function probeLiteralVariablePaths(profile) {
        const probes = [];
        const chatRoot = window.__st_live_data && window.__st_live_data.stat_data
            ? window.__st_live_data.stat_data
            : window.stat_data || window.__st_live_data || {};
        (profile.literalPaths || []).forEach(function (entry) {
            const probe = readPathState(chatRoot, entry.path);
            probes.push(Object.assign({ kind: entry.kind, script: entry.script }, probe));
        });
        return probes;
    }

    function detectVariableReadinessUi() {
        const text = String(target && target.textContent || '').replace(/\s+/g, ' ').trim();
        const patterns = [
            /Biến\s+chưa\s+sẵn\s+sàng/i,
            /variables?\s+(?:are\s+)?not\s+ready/i,
            /waiting\s+for\s+variables?/i
        ];
        for (let index = 0; index < patterns.length; index += 1) {
            const match = text.match(patterns[index]);
            if (!match) continue;
            const at = Math.max(0, match.index || 0);
            return {
                found: true,
                marker: match[0],
                textSample: text.slice(Math.max(0, at - 160), Math.min(text.length, at + 320))
            };
        }
        return { found: false, marker: '', textSample: '' };
    }

    const variableDependencyProfile = buildVariableDependencyProfile(descriptors);
    let lastVariableDiagnosticSignature = '';

    function reportVariableReadinessIfNeeded(trigger) {
        if (!variableDependencyProfile.usesVariables) return;
        if (typeof window.__cardRuntimeVariableReadinessSnapshot !== 'function') return;
        const snapshot = window.__cardRuntimeVariableReadinessSnapshot();
        const chat = snapshot && snapshot.chat || {};
        const missingReads = Array.isArray(snapshot && snapshot.missingPaths) ? snapshot.missingPaths : [];
        const missingChatState = variableDependencyProfile.requiresChatState && Number(chat.stateKeyCount || 0) === 0;
        const missingAllVariables = variableDependencyProfile.usesVariableApi && Number(snapshot && snapshot.totalKeyCount || 0) === 0;
        const literalPathProbes = probeLiteralVariablePaths(variableDependencyProfile);
        const missingLiteralPaths = literalPathProbes.filter(function (probe) { return probe.exists === false; });
        const uiReadiness = detectVariableReadinessUi();
        if (!missingChatState && !missingAllVariables && missingReads.length === 0 && missingLiteralPaths.length === 0 && !uiReadiness.found) return;

        const signature = JSON.stringify({
            missingChatState: missingChatState,
            missingAllVariables: missingAllVariables,
            missingReads: missingReads,
            missingLiteralPaths: missingLiteralPaths.map(function (probe) { return probe.kind + ':' + probe.path; }),
            uiMarker: uiReadiness.marker,
            chatKeys: chat.stateKeyCount || 0
        });
        if (signature === lastVariableDiagnosticSignature) return;
        lastVariableDiagnosticSignature = signature;

        window._cardStudio.diagnostic(
            'CARD_RUNTIME_VARIABLES_NOT_READY',
            'post-script-readiness',
            'variables',
            uiReadiness.found
                ? 'Giao diện của thẻ vẫn báo biến chưa sẵn sàng dù runtime đã có dữ liệu biến.'
                : 'Thẻ đã chạy nhưng dữ liệu biến mà script cần vẫn chưa sẵn sàng.',
            {
                severity: 'warning',
                scriptId: window.getScriptId ? window.getScriptId() : undefined,
                scriptName: window.getScriptName ? window.getScriptName() : undefined,
                details: {
                    trigger: trigger || 'unspecified',
                    dependencyProfile: variableDependencyProfile,
                    missingChatState: missingChatState,
                    missingAllVariables: missingAllVariables,
                    missingLiteralPaths: missingLiteralPaths,
                    literalPathProbes: literalPathProbes,
                    uiReportedNotReady: uiReadiness.found,
                    uiReadiness: uiReadiness,
                    variableState: snapshot,
                    parentVariableDiagnostics: window.__CARD_STUDIO_BOOT__ && window.__CARD_STUDIO_BOOT__.variableDiagnostics
                        ? window.__CARD_STUDIO_BOOT__.variableDiagnostics
                        : null,
                    bootVariableScopesPresent: Boolean(window.__CARD_STUDIO_BOOT__ && window.__CARD_STUDIO_BOOT__.variableScopes),
                    bootVariableScopeNames: window.__CARD_STUDIO_BOOT__ && window.__CARD_STUDIO_BOOT__.variableScopes
                        ? Object.keys(window.__CARD_STUDIO_BOOT__.variableScopes)
                        : []
                }
            }
        );
    }

`;
}
