// Ordered UI composition. Each stage owns only its own factories and dependencies.
// Retain the original initialization sequence and the late model-test dependency.
import { composeEditorFoundationsUi } from './ui/editor-foundations.js';
import { composeCatalogEditorUi } from './ui/catalog-editor.js';
import { composePresetCatalogUi } from './ui/preset-catalog.js';
import { composeSettingsUi } from './ui/settings.js';
import { composeSessionNavigationUi } from './ui/session-navigation.js';
import { composeMessageViewUi } from './ui/message-view.js';
import { composeDiagnosticsUi } from './ui/diagnostics.js';
import { composeWorldInfoDialogsUi } from './ui/world-info-dialogs.js';
import { composeRpgActionsUi } from './ui/rpg-actions.js';
import { composeApplicationShellUi } from './ui/application-shell.js';

export function composeApplicationUi(ctx) {
  const bindings = {};
  Object.assign(bindings, composeEditorFoundationsUi(ctx));
  Object.assign(bindings, composeCatalogEditorUi(ctx, bindings, () => bindings.__stsModelTestButton));
  Object.assign(bindings, composePresetCatalogUi(ctx, bindings));
  Object.assign(bindings, composeSettingsUi(ctx, bindings));
  Object.assign(bindings, composeSessionNavigationUi(ctx, bindings));
  Object.assign(bindings, composeMessageViewUi(ctx, bindings));
  Object.assign(bindings, composeDiagnosticsUi(ctx, bindings));
  Object.assign(bindings, composeWorldInfoDialogsUi(ctx, bindings));
  Object.assign(bindings, composeRpgActionsUi(ctx, bindings));
  Object.assign(bindings, composeApplicationShellUi(ctx, bindings));
  return bindings;
}
