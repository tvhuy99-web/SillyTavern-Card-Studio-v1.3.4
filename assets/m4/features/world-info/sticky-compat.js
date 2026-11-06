/**
 * World Info compatibility for Lorebook UID types and pre-3-turn settings.
 *
 * Legacy World Info stores runtime keys in JSON objects (therefore strings)
 * but often stores entry.uid as a number. Its resolver uses strict identity
 * for Set membership and entry lookup, unintentionally dropping Sticky.
 * This boundary normalizes UIDs only while evaluating the existing resolver;
 * the entry objects exposed to Card Studio retain their original UID types.
 */
export const AI_STICKY_DEFAULT_TURNS = 3;
const MIGRATION_FLAG = '__stsSticky3MigrationV1';

export function migrateSmartScanStickySettings(settings) {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return settings;
  if (settings[MIGRATION_FLAG] === true) return settings;
  return {
    ...settings,
    // Prior builds shipped with 5 as the default. Honor the explicit request
    // to switch to 3 once, but preserve all other custom settings.
    ...(Number(settings.aiStickyDuration) === 5 ? { aiStickyDuration: AI_STICKY_DEFAULT_TURNS } : {}),
    [MIGRATION_FLAG]: true,
  };
}

export function markSmartScanStickySettingsSaved(settings) {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return settings;
  return { ...settings, [MIGRATION_FLAG]: true };
}

export function createUidSafeWorldInfoResolver(legacyResolver) {
  if (typeof legacyResolver !== 'function') throw new TypeError('World Info resolver is required');

  return function resolveWorldInfoWithCanonicalUids(
    scanInput, entries, worldInfoState, worldInfoRuntime,
    worldInfoPinned, selectedUids, skipKeyword, sequence, aiStickyDuration,
  ) {
    const originals = Array.isArray(entries) ? entries : [];
    const keyToOriginal = new Map();
    const normalizedEntries = originals.map(entry => {
      if (entry?.uid == null) return entry;
      const key = String(entry.uid);
      if (!keyToOriginal.has(key)) keyToOriginal.set(key, entry);
      return typeof entry.uid === 'string' ? entry : { ...entry, uid: key };
    });
    // All selected UIDs, keyword hits, runtime-state keys and pins must be
    // compared as the same canonical type inside the old World Info engine.
    const normalizedSelected = Array.isArray(selectedUids)
      ? selectedUids.filter(uid => uid != null).map(uid => String(uid))
      : [];
    // Sticky state from a previous installation may still contain 5 turns.
    // On the first new scan cap it to the configured policy; a larger
    // *per-entry* Sticky value remains an explicit override.
    const originalRuntime = worldInfoRuntime && typeof worldInfoRuntime === 'object'
      ? worldInfoRuntime : {};
    const normalizedRuntime = { ...originalRuntime };
    const globalHold = Number(aiStickyDuration);
    for (const [key, entry] of keyToOriginal.entries()) {
      const snapshot = originalRuntime[key];
      if (!snapshot || typeof snapshot !== 'object') continue;
      const ownHold = Number(entry?.sticky);
      const maxHold = Math.max(
        Number.isFinite(globalHold) && globalHold >= 0 ? globalHold : 0,
        Number.isFinite(ownHold) && ownHold >= 0 ? ownHold : 0,
      );
      const previous = Number(snapshot.stickyDuration);
      if (Number.isFinite(previous) && previous > maxHold) {
        normalizedRuntime[key] = { ...snapshot, stickyDuration: maxHold };
      }
    }

    const result = legacyResolver(
      scanInput, normalizedEntries, worldInfoState, normalizedRuntime,
      worldInfoPinned, normalizedSelected, skipKeyword, sequence, aiStickyDuration,
    );
    if (!result || !Array.isArray(result.activeEntries)) return result;

    return {
      ...result,
      activeEntries: result.activeEntries.map(entry =>
        keyToOriginal.get(String(entry?.uid)) || entry),
    };
  };
}
