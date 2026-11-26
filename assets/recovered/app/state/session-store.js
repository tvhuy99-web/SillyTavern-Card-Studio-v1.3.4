import { createSessionRpgActions } from './session-rpg-actions.js';

// This is the existing Zustand store, not an additional copy of session data.
// Explicit action groups share its original Immer transaction.
function createDiagnosticsActions(setState, dependencies) {
    const log = (method, value) => setState(draft => {
        draft.logs = dependencies.__stsDiagnosticsState[method](value);
    });
    return {
        addSystemLog: value => log('addSystem', value),
        addLogTurn: value => log('addTurn', value),
        updateCurrentTurn: value => log('updateCurrentTurn', value),
        addSmartScanLog: value => log('addSmartScan', value),
        addMythicLog: value => log('addMythic', value),
        addSelectionLog: value => log('addSelection', value),
        addNetworkLog: value => setState(draft => {
            draft.logs = dependencies.__stsDiagnosticsState.addNetwork((0, dependencies.Bs)(value));
        }),
        clearLogs: () => setState(draft => { draft.logs = dependencies.__stsDiagnosticsState.clear(); })
    };
}

function createArenaActions(setState, getState, dependencies) {
    function setArenaField(field, value) {
        setState(draft => {
            draft[field] = value;
        });
        const next = getState();
        (0, dependencies.Es)({
            enabled: next.isArenaMode,
            provider: next.arenaProvider,
            modelId: next.arenaModelId,
            userProfileId: next.arenaUserProfileId,
        });
    }
    return {
        setArenaMode: value => setArenaField('isArenaMode', value),
        setArenaModelId: value => setArenaField('arenaModelId', value),
        setArenaProvider: value => setArenaField('arenaProvider', value),
        setArenaUserProfileId: value => setArenaField('arenaUserProfileId', value)
    };
}

export function createSessionStore(dependencies) {
    const createStore = dependencies.At;
    const immer = dependencies.It;
    return createStore()(immer((setState, getState) => {
        const setField = (field, value) => setState(draft => { draft[field] = value; });
        return {
            ...dependencies.il,
            setSessionData: patch => {
                if ((Object.prototype.hasOwnProperty.call(patch, 'sessionId') && patch.sessionId !== getState().sessionId) || (Object.prototype.hasOwnProperty.call(patch,'__stsRecordGeneration') && patch.__stsRecordGeneration !== getState().__stsRecordGeneration)) {
                    dependencies.__stsRuntimeState.invalidateSession();
                }
                return setState(draft => {
                    if (patch.sessionId && patch.sessionId !== draft.sessionId) dependencies.__stsDiagnosticsState.activate(patch.sessionId);
                    Object.assign(draft, patch);
                    if (patch.sessionId) draft.logs = dependencies.__stsDiagnosticsState.snapshot();
                    if (patch.logs) draft.logs = dependencies.__stsDiagnosticsState.replace(patch.logs);
                });
            },
            addMessage: message => setState(draft => { draft.messages.push(message); }),
            updateMessage: (id, patch) => setState(draft => {
                const message = draft.messages.find(message => message.id === id);
                if (message) Object.assign(message, patch);
            }),
            setMessages: value => setField('messages', value),
            setVariables: value => setField('variables', value),
            ...createDiagnosticsActions(setState, dependencies),
            setLongTermSummaries: value => setField('longTermSummaries', value),
            setSummaryQueue: value => setField('summaryQueue', value),
            setStoryQueue: value => setField('storyQueue', value),
            clearStoryQueue: () => setField('storyQueue', []),
            setLastStateBlock: value => setField('lastStateBlock', value),
            setIsInputLocked: value => setField('isInputLocked', value),
            setIsAutoLooping: value => setField('isAutoLooping', value),
            setQuickReplies: value => setField('quickReplies', value),
            setScriptButtons: value => setField('scriptButtons', value),
            setRpgNotification: value => setField('rpgNotification', value),
            setGeneratedLorebookEntries: value => setField('generatedLorebookEntries', value),
            setLoading: value => setField('isLoading', value),
            setError: value => setField('error', value),
            addAbortController: controller => { dependencies.__stsRuntimeState.add(controller); },
            removeAbortController: controller => { dependencies.__stsRuntimeState.remove(controller); },
            abortAll: () => { dependencies.__stsRuntimeState.abortAll(); },
            ...createArenaActions(setState, getState, dependencies),
            resetStore: () => setState(draft => {
                dependencies.__stsRuntimeState.invalidateSession('store-reset');
                dependencies.__stsDiagnosticsState.activate(null);
                Object.assign(draft, dependencies.il);
                draft.logs = dependencies.__stsDiagnosticsState.snapshot();
            }),
            ...createSessionRpgActions(setState, dependencies)
        };
    }));
}
