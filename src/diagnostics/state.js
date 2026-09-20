const EMPTY = Object.freeze({
  turns: [],
  systemLog: [],
  smartScanLog: [],
  mythicLog: [],
  networkLog: [],
  selectionLog: [],
});

const sessions = new Map();
let activeSessionId = null;
let state = clone(EMPTY);

function array(value) {
  return Array.isArray(value) ? value : [];
}

function clone(value) {
  return {
    turns: array(value?.turns).slice(0, 10),
    systemLog: array(value?.systemLog).slice(0, 1),
    smartScanLog: array(value?.smartScanLog).slice(0, 1),
    mythicLog: array(value?.mythicLog).slice(0, 1),
    networkLog: array(value?.networkLog).slice(0, 1),
    selectionLog: array(value?.selectionLog).slice(0, 1),
  };
}

function keyOf(sessionId) {
  const key = String(sessionId ?? '').trim();
  return key || null;
}

function saveActive() {
  if (activeSessionId) sessions.set(activeSessionId, clone(state));
}

function publish(next) {
  state = clone(next);
  if (activeSessionId) sessions.set(activeSessionId, clone(state));
  return snapshot();
}

export function activate(sessionId) {
  const nextId = keyOf(sessionId);
  if (nextId === activeSessionId) return snapshot();
  saveActive();
  activeSessionId = nextId;
  state = nextId && sessions.has(nextId) ? clone(sessions.get(nextId)) : clone(EMPTY);
  return snapshot();
}

export function snapshot() {
  return clone(state);
}

export function replace(value) {
  return publish(value);
}

export function clear() {
  return publish(EMPTY);
}

export function addTurn(value) {
  return publish({ ...state, turns: [value, ...state.turns].slice(0, 10) });
}

export function updateCurrentTurn(patch) {
  if (!state.turns.length) return snapshot();
  const turns = state.turns.slice();
  turns[0] = { ...turns[0], ...patch };
  return publish({ ...state, turns });
}

export function addSystem(value) {
  return publish({ ...state, systemLog: [value] });
}

export function addSmartScan(value) {
  return publish({ ...state, smartScanLog: [value] });
}

export function addMythic(value) {
  return publish({ ...state, mythicLog: [value] });
}

export function addSelection(value) {
  return publish({ ...state, selectionLog: [value] });
}

export function addNetwork(value) {
  return publish({ ...state, networkLog: [value] });
}

export const diagnosticsState = Object.freeze({
  activate,
  snapshot,
  replace,
  clear,
  addTurn,
  updateCurrentTurn,
  addSystem,
  addSmartScan,
  addMythic,
  addSelection,
  addNetwork,
});
