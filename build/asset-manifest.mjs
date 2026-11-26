// Transitional output mapping; retain public asset URLs until migration is complete.
import { posix } from 'node:path';
import { copyFile, mkdir, readFile, writeFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
const root = new URL('../', import.meta.url);
const file = name => new URL(name, root);
export const entrySource = 'src/app/entry.js';
export const entryOutput = 'assets/app-entry-v1.3.6.js';
export const hostSource = 'src/app/host.js';
export const productionOutput = 'assets/app-production-v1.3.6.js';
export const runtimeCoreOutput = 'assets/card-runtime-core-builder-v1.3.6.js';
export const runtimeRendererOutput = 'assets/card-runtime-renderer-v1.3.6.js';
export const copiedAssets = Object.freeze([
  Object.freeze(['src/platform/library-runtime.js', 'assets/recovered/platform/library-runtime.js']),
  Object.freeze(['src/providers/common/host-provider-bindings.js', 'assets/recovered/providers/common/host-provider-bindings.js']),
  Object.freeze(['src/core/async/optional-module.js', 'assets/recovered/core/async/optional-module.js']),

  Object.freeze(['src/core/async/serial-queue.js', 'assets/recovered/core/async/serial-queue.js']),
  Object.freeze(['src/runtime/card-runtime/host/method-router.js', 'assets/recovered/runtime/card-runtime/host/method-router.js']),
  Object.freeze(['src/runtime/card-runtime/host/runtime-prompt.js', 'assets/recovered/runtime/card-runtime/host/runtime-prompt.js']),
  Object.freeze(['src/runtime/card-runtime/host/runtime-events.js', 'assets/recovered/runtime/card-runtime/host/runtime-events.js']),

  Object.freeze(['src/app/state/session-rpg-actions.js', 'assets/recovered/app/state/session-rpg-actions.js']),
  Object.freeze(['src/vendor/immer-mapset.js', 'assets/recovered/vendor/immer-mapset.js']),
  Object.freeze(['src/app/lifecycle/mount-application.js', 'assets/recovered/app/lifecycle/mount-application.js']),
  Object.freeze(['src/core/parse-relaxed-json.js', 'assets/recovered/core/parse-relaxed-json.js']),
  Object.freeze(['src/ui/components/display-formatting.js', 'assets/recovered/ui/components/display-formatting.js']),
  Object.freeze(['src/features/rpg/table-lorebook-links.js', 'assets/recovered/features/rpg/table-lorebook-links.js']),
  Object.freeze(['src/app/state/session-defaults.js', 'assets/recovered/app/state/session-defaults.js']),
  Object.freeze(['src/features/rpg/rpg-import.js', 'assets/recovered/features/rpg/rpg-import.js']),
  Object.freeze(['src/ui/settings/gemini-catalog-hook.js', 'assets/recovered/ui/settings/gemini-catalog-hook.js']),
  Object.freeze(['src/ui/components/dialog-focus.js', 'assets/recovered/ui/components/dialog-focus.js']),
  Object.freeze(['src/features/world-info/ui/embedding-sync-hook.js', 'assets/recovered/features/world-info/ui/embedding-sync-hook.js']),
  Object.freeze(['src/features/prompts/macro-reference.js', 'assets/recovered/features/prompts/macro-reference.js']),
  Object.freeze(['src/features/presets/preset-file.js', 'assets/recovered/features/presets/preset-file.js']),
  Object.freeze(['src/ui/components/radio-navigation.js', 'assets/recovered/ui/components/radio-navigation.js']),
  Object.freeze(['src/features/chat/summary-generation.js', 'assets/recovered/features/chat/summary-generation.js']),
  Object.freeze(['src/features/chat/epub-import.js', 'assets/recovered/features/chat/epub-import.js']),
  Object.freeze(['src/runtime/card-runtime/host/compatibility-data.js', 'assets/recovered/runtime/card-runtime/host/compatibility-data.js']),
  Object.freeze(['src/diagnostics/card-runtime-diagnostics.js', 'assets/recovered/diagnostics/card-runtime-diagnostics.js']),
  Object.freeze(['src/runtime/card-runtime/host/context-adapters.js', 'assets/recovered/runtime/card-runtime/host/context-adapters.js']),
  Object.freeze(['src/runtime/card-runtime/host/slash-command-reference.js', 'assets/recovered/runtime/card-runtime/host/slash-command-reference.js']),
  Object.freeze(['src/features/rpg/action-proposal-prompt.js', 'assets/recovered/features/rpg/action-proposal-prompt.js']),
  Object.freeze(['src/app/lifecycle/application-lifecycle.js', 'assets/recovered/app/lifecycle/application-lifecycle.js']),
  Object.freeze(['src/features/chat/hooks/use-diagnostics.js', 'assets/recovered/features/chat/hooks/use-diagnostics.js']),
  Object.freeze(['src/features/chat/hooks/use-response-pipeline.js', 'assets/recovered/features/chat/hooks/use-response-pipeline.js']),
  Object.freeze(['src/features/chat/hooks/use-smart-scan.js', 'assets/recovered/features/chat/hooks/use-smart-scan.js']),
  Object.freeze(['src/features/chat/hooks/use-conversation.js', 'assets/recovered/features/chat/hooks/use-conversation.js']),
  Object.freeze(['src/features/chat/standalone-mythic.js', 'assets/recovered/features/chat/standalone-mythic.js']),
  Object.freeze(['src/features/chat/history-policy.js', 'assets/recovered/features/chat/history-policy.js']),
  Object.freeze(['src/features/chat/hooks/use-session-persistence.js', 'assets/recovered/features/chat/hooks/use-session-persistence.js']),
  Object.freeze(['src/features/chat/hooks/use-smart-context.js', 'assets/recovered/features/chat/hooks/use-smart-context.js']),
  Object.freeze(['src/features/chat/hooks/use-message-history.js', 'assets/recovered/features/chat/hooks/use-message-history.js']),
  Object.freeze(['src/features/chat/hooks/use-slash-commands.js', 'assets/recovered/features/chat/hooks/use-slash-commands.js']),
  Object.freeze(['src/features/chat/hooks/use-card-runtime.js', 'assets/recovered/features/chat/hooks/use-card-runtime.js']),
  Object.freeze(['src/features/chat/hooks/use-chat-session.js', 'assets/recovered/features/chat/hooks/use-chat-session.js']),
  Object.freeze(['src/app/state/lorebook-store.js', 'assets/recovered/app/state/lorebook-store.js']),
  Object.freeze(['src/app/state/session-store.js', 'assets/recovered/app/state/session-store.js']),
  Object.freeze(['src/app/state/character-store.js', 'assets/recovered/app/state/character-store.js']),
  Object.freeze(['src/app/state/preset-store.js', 'assets/recovered/app/state/preset-store.js']),
  Object.freeze(['src/app/state/persona-store.js', 'assets/recovered/app/state/persona-store.js']),
  Object.freeze(['src/features/world-info/lorebook-file.js', 'assets/recovered/features/world-info/lorebook-file.js']),
  Object.freeze(['src/app/state/settings-keys.js', 'assets/recovered/app/state/settings-keys.js']),
  Object.freeze(['src/features/state/default-feature-settings.js', 'assets/recovered/features/state/default-feature-settings.js']),
  Object.freeze(['src/features/state/feature-settings.js', 'assets/recovered/features/state/feature-settings.js']),
  Object.freeze(['src/features/rpg/table-processing.js', 'assets/recovered/features/rpg/table-processing.js']),
  Object.freeze(['src/features/catalog/character-export.js', 'assets/recovered/features/catalog/character-export.js']),
  Object.freeze(['src/features/catalog/character-file.js', 'assets/recovered/features/catalog/character-file.js']),
  Object.freeze(['src/vendor/lodash-runtime.js', 'assets/recovered/vendor/lodash-runtime.js']),
  Object.freeze(['src/features/state/script-execution.js', 'assets/recovered/features/state/script-execution.js']),
  Object.freeze(['src/features/prompts/macro-processing.js', 'assets/recovered/features/prompts/macro-processing.js']),
  Object.freeze(['src/features/chat/regex-processing.js', 'assets/recovered/features/chat/regex-processing.js']),
  Object.freeze(['src/features/speech/audio-conversion.js', 'assets/recovered/features/speech/audio-conversion.js']),
  Object.freeze(['src/features/speech/speech-engine.js', 'assets/recovered/features/speech/speech-engine.js']),
  Object.freeze(['src/app/persistence/backup-codec.js', 'assets/recovered/app/persistence/backup-codec.js']),
  Object.freeze(['src/features/world-info/keyword-matching.js', 'assets/recovered/features/world-info/keyword-matching.js']),
  Object.freeze(['src/runtime/card-runtime/host/slash-commands.js', 'assets/recovered/runtime/card-runtime/host/slash-commands.js']),
  Object.freeze(['src/runtime/card-runtime/frame-context.js', 'assets/recovered/runtime/card-runtime/frame-context.js']),
  Object.freeze(['src/vendor/markdown-runtime.js', 'assets/recovered/vendor/markdown-runtime.js']),
  Object.freeze(['src/vendor/html-sanitizer-runtime.js', 'assets/recovered/vendor/html-sanitizer-runtime.js']),
  Object.freeze(['src/vendor/react-state-runtime.js', 'assets/recovered/vendor/react-state-runtime.js']),
  Object.freeze(['src/vendor/google-genai-runtime.js', 'assets/recovered/vendor/google-genai-runtime.js']),
  Object.freeze(['src/ui/shell/providers.js', 'assets/recovered/ui/shell/providers.js']),
  Object.freeze(['src/ui/settings/settings-screen.js', 'assets/recovered/ui/settings/settings-screen.js']),
  Object.freeze(['src/ui/settings/sections/action-suggestion-settings.js', 'assets/recovered/ui/settings/sections/action-suggestion-settings.js']),
  Object.freeze(['src/ui/settings/sections/backup-settings.js', 'assets/recovered/ui/settings/sections/backup-settings.js']),
  Object.freeze(['src/ui/settings/sections/card-runtime-settings.js', 'assets/recovered/ui/settings/sections/card-runtime-settings.js']),
  Object.freeze(['src/ui/settings/sections/literary-settings.js', 'assets/recovered/ui/settings/sections/literary-settings.js']),
  Object.freeze(['src/ui/settings/sections/smart-context-settings.js', 'assets/recovered/ui/settings/sections/smart-context-settings.js']),
  Object.freeze(['src/ui/settings/sections/smart-scan-settings.js', 'assets/recovered/ui/settings/sections/smart-scan-settings.js']),
  Object.freeze(['src/ui/settings/sections/speech-settings.js', 'assets/recovered/ui/settings/sections/speech-settings.js']),
  Object.freeze(['src/features/arena/ui/arena-settings-dialog.js', 'assets/recovered/features/arena/ui/arena-settings-dialog.js']),
  Object.freeze(['src/features/chat/session/greeting-dialog.js', 'assets/recovered/features/chat/session/greeting-dialog.js']),
  Object.freeze(['src/features/chat/session/session-list-item.js', 'assets/recovered/features/chat/session/session-list-item.js']),
  Object.freeze(['src/features/chat/session/session-list-screen.js', 'assets/recovered/features/chat/session/session-list-screen.js']),
  Object.freeze(['src/features/chat/story/story-setup-dialog.js', 'assets/recovered/features/chat/story/story-setup-dialog.js']),
  Object.freeze(['src/features/chat/ui/chat-composer.js', 'assets/recovered/features/chat/ui/chat-composer.js']),
  Object.freeze(['src/features/chat/ui/chat-dialogs.js', 'assets/recovered/features/chat/ui/chat-dialogs.js']),
  Object.freeze(['src/features/chat/ui/chat-header.js', 'assets/recovered/features/chat/ui/chat-header.js']),
  Object.freeze(['src/features/chat/ui/chat-session-screen.js', 'assets/recovered/features/chat/ui/chat-session-screen.js']),
  Object.freeze(['src/features/chat/ui/chat-settings-dialog.js', 'assets/recovered/features/chat/ui/chat-settings-dialog.js']),
  Object.freeze(['src/features/speech/ui/speech-controls.js', 'assets/recovered/features/speech/ui/speech-controls.js']),
  Object.freeze(['src/ui/settings/quick-connection-badge.js', 'assets/recovered/ui/settings/quick-connection-badge.js']),
  Object.freeze(['src/ui/settings/quick-connection-dialog.js', 'assets/recovered/ui/settings/quick-connection-dialog.js']),
  Object.freeze(['src/diagnostics/ui/diagnostics-dialog.js', 'assets/recovered/diagnostics/ui/diagnostics-dialog.js']),
  Object.freeze(['src/diagnostics/ui/mythic-log-panel.js', 'assets/recovered/diagnostics/ui/mythic-log-panel.js']),
  Object.freeze(['src/diagnostics/ui/network-log-panel.js', 'assets/recovered/diagnostics/ui/network-log-panel.js']),
  Object.freeze(['src/diagnostics/ui/prompt-log-panel.js', 'assets/recovered/diagnostics/ui/prompt-log-panel.js']),
  Object.freeze(['src/diagnostics/ui/response-log-panel.js', 'assets/recovered/diagnostics/ui/response-log-panel.js']),
  Object.freeze(['src/diagnostics/ui/summary-log-panel.js', 'assets/recovered/diagnostics/ui/summary-log-panel.js']),
  Object.freeze(['src/diagnostics/ui/system-log-panel.js', 'assets/recovered/diagnostics/ui/system-log-panel.js']),
  Object.freeze(['src/diagnostics/ui/world-info-log-panel.js', 'assets/recovered/diagnostics/ui/world-info-log-panel.js']),
  Object.freeze(['src/app/state/application-stores.js', 'assets/recovered/app/state/application-stores.js']),
  Object.freeze(['src/features/chat/hooks/session-hooks.js', 'assets/recovered/features/chat/hooks/session-hooks.js']),
  Object.freeze(['src/features/rpg/default-database.js', 'assets/recovered/features/rpg/default-database.js']),
  Object.freeze(['src/features/catalog/default-character.js', 'assets/recovered/features/catalog/default-character.js']),
  Object.freeze(['src/features/presets/default-preset.js', 'assets/recovered/features/presets/default-preset.js']),
  Object.freeze(['src/ui/components/input-controls.js', 'assets/recovered/ui/components/input-controls.js']),
  Object.freeze(['src/features/chat/ui/chat-controls.js', 'assets/recovered/features/chat/ui/chat-controls.js']),
  Object.freeze(['src/ui/components/file-name-dialog.js', 'assets/recovered/ui/components/file-name-dialog.js']),
  Object.freeze(['src/runtime/card-runtime/core-builder.js', 'assets/card-runtime-core-builder-v1.3.6.js']),
  Object.freeze(['src/runtime/card-runtime/renderer.js', 'assets/card-runtime-renderer-v1.3.6.js']),
  Object.freeze(['src/platform/android/native-bridge.js', 'assets/recovered/platform/android/native-bridge.js']),
  Object.freeze(['src/core/async/cancellation.js', 'assets/m4/core/async/cancellation.js']),
  Object.freeze(['src/runtime/card-runtime/host/rpc-dispatcher.js', 'assets/m4/runtime/card-runtime/host/rpc-dispatcher.js']),
  Object.freeze(['src/features/world-info/lorebook-mutations.js', 'assets/m4/features/world-info/lorebook-mutations.js']),
  Object.freeze(['src/runtime/card-runtime/host/utility-rpc.js', 'assets/m4/runtime/card-runtime/host/utility-rpc.js']),
  Object.freeze(['src/features/chat/chat-import.js', 'assets/m4/features/chat/chat-import.js']),
  Object.freeze(['src/runtime/card-runtime/host/lorebook-rpc.js', 'assets/m4/runtime/card-runtime/host/lorebook-rpc.js']),
  Object.freeze(['src/runtime/card-runtime/host/catalog-rpc.js', 'assets/m4/runtime/card-runtime/host/catalog-rpc.js']),
  Object.freeze(['src/features/catalog/catalog-mutations.js', 'assets/m4/features/catalog/catalog-mutations.js']),
  Object.freeze(['src/runtime/card-runtime/host/state-rpc.js', 'assets/m4/runtime/card-runtime/host/state-rpc.js']),
  Object.freeze(['src/runtime/card-runtime/host/chat-rpc.js', 'assets/m4/runtime/card-runtime/host/chat-rpc.js']),
  Object.freeze(['src/runtime/card-runtime/host/generation-tasks.js', 'assets/m4/runtime/card-runtime/host/generation-tasks.js']),
  Object.freeze(['src/features/state/initial-variable-service.js', 'assets/initial-variable-service-v1.3.6.js']),
  Object.freeze(['src/features/chat/conversation-service.js', 'assets/m4/features/chat/conversation-service.js']),
  Object.freeze(['src/features/chat/live-stream-store.js', 'assets/m4/features/chat/live-stream-store.js']),
  Object.freeze(['src/features/chat/response-processor.js', 'assets/m4/features/chat/response-processor.js']),
  Object.freeze(['src/features/chat/turn-policy.js', 'assets/m4/features/chat/turn-policy.js']),
  Object.freeze(['src/features/prompts/prompt-service.js', 'assets/m4/features/prompts/prompt-service.js']),
  Object.freeze(['src/features/prompts/prompt-assembler.js', 'assets/m4/features/prompts/prompt-assembler.js']),
  Object.freeze(['src/features/prompts/story-content.js', 'assets/m4/features/prompts/story-content.js']),
  Object.freeze(['src/features/world-info/embedding-service.js', 'assets/m4/features/world-info/embedding-service.js']),
  Object.freeze(['src/features/world-info/embedding-index-repository.js', 'assets/m4/features/world-info/embedding-index-repository.js']),
  Object.freeze(['src/features/world-info/embeddinggemma2-litert-bridge.js', 'assets/m4/features/world-info/embeddinggemma2-litert-bridge.js']),
  Object.freeze(['src/features/world-info/native-embedding-bridge.js', 'assets/m4/features/world-info/native-embedding-bridge.js']),
  Object.freeze(['src/features/world-info/smart-scan-service.js', 'assets/m4/features/world-info/smart-scan-service.js']),
  Object.freeze(['src/features/world-info/sticky-compat.js', 'assets/m4/features/world-info/sticky-compat.js']),
  Object.freeze(['src/providers/aistudio/text.js', 'assets/m4/providers/aistudio/text.js']),
  Object.freeze(['src/providers/aistudio/model-catalog.js', 'assets/m4/providers/aistudio/model-catalog.js']),
  Object.freeze(['src/providers/common/connection-repository.js', 'assets/m4/providers/common/connection-repository.js']),
  Object.freeze(['src/providers/common/model-catalog.js', 'assets/m4/providers/common/model-catalog.js']),
  Object.freeze(['src/providers/common/provider-registry.js', 'assets/m4/providers/common/provider-registry.js']),
  Object.freeze(['src/providers/common/generation-gateway.js', 'assets/m4/providers/common/generation-gateway.js']),
  Object.freeze(['src/providers/common/generation-utils.js', 'assets/m4/providers/common/generation-utils.js']),
  Object.freeze(['src/providers/gemini/generation.js', 'assets/m4/providers/gemini/generation.js']),
  Object.freeze(['src/providers/openrouter/generation.js', 'assets/m4/providers/openrouter/generation.js']),
  Object.freeze(['src/providers/proxy/generation.js', 'assets/m4/providers/proxy/generation.js']),
  Object.freeze(['src/app/persistence/session-state.js', 'assets/m5/app/persistence/session-state.js']),
  Object.freeze(['src/app/persistence/session-save-coordinator.js', 'assets/m5/app/persistence/session-save-coordinator.js']),
  Object.freeze(['src/app/persistence/guarded-storage.js', 'assets/m5/app/persistence/guarded-storage.js']),
  Object.freeze(['src/app/persistence/app-database.js', 'assets/m5/app/persistence/app-database.js']),
  Object.freeze(['src/app/persistence/entity-repositories.js', 'assets/m5/app/persistence/entity-repositories.js']),
  Object.freeze(['src/app/state/runtime-state.js', 'assets/m5/app/state/runtime-state.js']),
  Object.freeze(['src/diagnostics/state.js', 'assets/m5/diagnostics/state.js']),
  Object.freeze(['src/features/arena/state-machine.js', 'assets/m5/features/arena/state-machine.js']),
  Object.freeze(['src/ui/runtime-guard.js', 'assets/m5/ui/runtime-guard.js']),
  Object.freeze(['src/ui/settings/connection-settings-screen.js', 'assets/m6/ui/settings/connection-settings-screen.js']),
  Object.freeze(['src/ui/settings/model-test-button.js', 'assets/m6/ui/settings/model-test-button.js']),
  Object.freeze(['src/ui/settings/settings-controller.js', 'assets/m6/ui/settings/settings-controller.js']),
  Object.freeze(['src/ui/settings/provider-sections/aistudio-section.js', 'assets/m6/ui/settings/provider-sections/aistudio-section.js']),
  Object.freeze(['src/ui/settings/provider-sections/gemini-section.js', 'assets/m6/ui/settings/provider-sections/gemini-section.js']),
  Object.freeze(['src/ui/settings/provider-sections/model-test-props.js', 'assets/m6/ui/settings/provider-sections/model-test-props.js']),
  Object.freeze(['src/ui/settings/provider-sections/openrouter-section.js', 'assets/m6/ui/settings/provider-sections/openrouter-section.js']),
  Object.freeze(['src/ui/settings/provider-sections/proxy-section.js', 'assets/m6/ui/settings/provider-sections/proxy-section.js']),
  Object.freeze(['src/ui/components/icon.js', 'assets/m6/ui/components/icon.js']),
  Object.freeze(['src/ui/components/tab-controls.js', 'assets/m6/ui/components/tab-controls.js']),
  Object.freeze(['src/ui/shell/application-shell.js', 'assets/m6/ui/shell/application-shell.js']),
  Object.freeze(['src/features/chat/ui/chat-route.js', 'assets/m6/features/chat/ui/chat-route.js']),
  Object.freeze(['src/ui/components/form-controls.js', 'assets/m6/ui/components/form-controls.js']),
  Object.freeze(['src/ui/components/section-controls.js', 'assets/m6/ui/components/section-controls.js']),
  Object.freeze(['src/features/world-info/ui/generate-entry-button.js', 'assets/m6/features/world-info/ui/generate-entry-button.js']),
  Object.freeze(['src/ui/components/recovered-primitives.js', 'assets/m6/ui/components/recovered-primitives.js']),
  Object.freeze(['src/ui/styles/accessibility.css', 'assets/m6/ui/accessibility.css']),
  Object.freeze(['src/diagnostics/aistudio-log.js', 'assets/m8/diagnostics/aistudio-log.js']),
  Object.freeze(['src/diagnostics/android-export-download.js', 'assets/m8/diagnostics/android-export-download.js']),
  Object.freeze(['src/features/presets/prompt-normalizer.js', 'assets/prompt-normalizer-v1.3.6.js']),
  Object.freeze(['src/providers/proxy/persistence.js', 'assets/proxy-persistence-service-v1.3.6.js']),
  Object.freeze(['src/features/state/smart-state-service.js', 'assets/smart-state-service-v1.3.6.js']),
  Object.freeze(['src/features/state/variable-scope-service.js', 'assets/variable-scope-service-v1.3.6.js']),
  Object.freeze(['src/diagnostics/network-redaction.js', 'assets/m8/diagnostics/network-redaction.js']),
  Object.freeze(['src/providers/common/http-transport.js', 'assets/m4/providers/common/http-transport.js']),
  Object.freeze(['src/providers/gemini/config.js', 'assets/m4/providers/gemini/config.js']),
  Object.freeze(['src/app/persistence/cross-tab-sync.js', 'assets/m5/app/persistence/cross-tab-sync.js']),
  Object.freeze(['src/app/persistence/backup-restore-service.js', 'assets/m5/app/persistence/backup-restore-service.js']),
  Object.freeze(['src/app/state/settings-repository.js', 'assets/m5/app/state/settings-repository.js']),
  Object.freeze(['src/features/characters/ui/character-extension-sections.js', 'assets/recovered/features/characters/ui/character-extension-sections.js']),
  Object.freeze(['src/features/characters/ui/character-greeting-editor.js', 'assets/recovered/features/characters/ui/character-greeting-editor.js']),
  Object.freeze(['src/features/characters/ui/character-metadata-sections.js', 'assets/recovered/features/characters/ui/character-metadata-sections.js']),
  Object.freeze(['src/features/characters/ui/character-screen.js', 'assets/recovered/features/characters/ui/character-screen.js']),
  Object.freeze(['src/features/characters/ui/character-tools.js', 'assets/recovered/features/characters/ui/character-tools.js']),
  Object.freeze(['src/features/characters/ui/regex-script-editor.js', 'assets/recovered/features/characters/ui/regex-script-editor.js']),
  Object.freeze(['src/features/characters/ui/tavern-script-editor.js', 'assets/recovered/features/characters/ui/tavern-script-editor.js']),
  Object.freeze(['src/features/personas/ui/persona-screen.js', 'assets/recovered/features/personas/ui/persona-screen.js']),
  Object.freeze(['src/features/presets/ui/preset-generation-sections.js', 'assets/recovered/features/presets/ui/preset-generation-sections.js']),
  Object.freeze(['src/features/presets/ui/preset-screen.js', 'assets/recovered/features/presets/ui/preset-screen.js']),
  Object.freeze(['src/features/presets/ui/prompt-editor.js', 'assets/recovered/features/presets/ui/prompt-editor.js']),
  Object.freeze(['src/features/presets/ui/prompt-manager.js', 'assets/recovered/features/presets/ui/prompt-manager.js']),
  Object.freeze(['src/features/presets/ui/prompt-preview.js', 'assets/recovered/features/presets/ui/prompt-preview.js']),
  Object.freeze(['src/features/world-info/ui/attach-lorebook-dialog.js', 'assets/recovered/features/world-info/ui/attach-lorebook-dialog.js']),
  Object.freeze(['src/features/world-info/ui/dynamic-world-info.js', 'assets/recovered/features/world-info/ui/dynamic-world-info.js']),
  Object.freeze(['src/features/world-info/ui/embedding-provider-status.js', 'assets/recovered/features/world-info/ui/embedding-provider-status.js']),
  Object.freeze(['src/features/world-info/ui/generate-entry-dialog.js', 'assets/recovered/features/world-info/ui/generate-entry-dialog.js']),
  Object.freeze(['src/features/world-info/ui/lorebook-entry-editor.js', 'assets/recovered/features/world-info/ui/lorebook-entry-editor.js']),
  Object.freeze(['src/features/world-info/ui/lorebook-entry-item.js', 'assets/recovered/features/world-info/ui/lorebook-entry-item.js']),
  Object.freeze(['src/features/world-info/ui/lorebook-entry-list.js', 'assets/recovered/features/world-info/ui/lorebook-entry-list.js']),
  Object.freeze(['src/features/world-info/ui/lorebook-library.js', 'assets/recovered/features/world-info/ui/lorebook-library.js']),
  Object.freeze(['src/features/world-info/ui/lorebook-manager.js', 'assets/recovered/features/world-info/ui/lorebook-manager.js']),
  Object.freeze(['src/features/world-info/ui/relevance-test-dialog.js', 'assets/recovered/features/world-info/ui/relevance-test-dialog.js']),
  Object.freeze(['src/features/arena/ui/arena-response-panel.js', 'assets/recovered/features/arena/ui/arena-response-panel.js']),
  Object.freeze(['src/features/arena/ui/arena-response-side.js', 'assets/recovered/features/arena/ui/arena-response-side.js']),
  Object.freeze(['src/features/chat/ui/chat-hud.js', 'assets/recovered/features/chat/ui/chat-hud.js']),
  Object.freeze(['src/features/chat/ui/messages/chat-message.js', 'assets/recovered/features/chat/ui/messages/chat-message.js']),
  Object.freeze(['src/features/chat/ui/messages/message-list.js', 'assets/recovered/features/chat/ui/messages/message-list.js']),
  Object.freeze(['src/features/chat/ui/messages/read-aloud-button.js', 'assets/recovered/features/chat/ui/messages/read-aloud-button.js']),
  Object.freeze(['src/features/chat/ui/messages/thinking-panel.js', 'assets/recovered/features/chat/ui/messages/thinking-panel.js']),
  Object.freeze(['src/features/chat/ui/streaming/live-stream-text.js', 'assets/recovered/features/chat/ui/streaming/live-stream-text.js']),
  Object.freeze(['src/features/chat/ui/streaming/streaming-html-preview.js', 'assets/recovered/features/chat/ui/streaming/streaming-html-preview.js']),
  Object.freeze(['src/features/rpg/ui/actions/action-proposal.js', 'assets/recovered/features/rpg/ui/actions/action-proposal.js']),
  Object.freeze(['src/features/rpg/ui/actions/action-suggestion-dialog.js', 'assets/recovered/features/rpg/ui/actions/action-suggestion-dialog.js']),
  Object.freeze(['src/features/rpg/ui/character-rpg-section.js', 'assets/recovered/features/rpg/ui/character-rpg-section.js']),
  Object.freeze(['src/features/rpg/ui/database/rpg-database-editor.js', 'assets/recovered/features/rpg/ui/database/rpg-database-editor.js']),
  Object.freeze(['src/features/rpg/ui/database/rpg-table-editor.js', 'assets/recovered/features/rpg/ui/database/rpg-table-editor.js']),
  Object.freeze(['src/features/rpg/ui/database/rpg-table-row.js', 'assets/recovered/features/rpg/ui/database/rpg-table-row.js']),
  Object.freeze(['src/features/rpg/ui/mythic/mythic-configuration-dialog.js', 'assets/recovered/features/rpg/ui/mythic/mythic-configuration-dialog.js']),
  Object.freeze(['src/features/rpg/ui/rpg-hud.js', 'assets/recovered/features/rpg/ui/rpg-hud.js']),
  Object.freeze(['src/features/rpg/ui/rpg-import-dialog.js', 'assets/recovered/features/rpg/ui/rpg-import-dialog.js']),
  Object.freeze(['src/features/rpg/ui/variables/variable-hud.js', 'assets/recovered/features/rpg/ui/variables/variable-hud.js']),
  Object.freeze(['src/features/rpg/ui/variables/variable-tree.js', 'assets/recovered/features/rpg/ui/variables/variable-tree.js']),
  Object.freeze(['src/ui/card-runtime/card-frame.js', 'assets/recovered/ui/card-runtime/card-frame.js']),
  Object.freeze(['src/ui/card-runtime/card-preview-dialog.js', 'assets/recovered/ui/card-runtime/card-preview-dialog.js']),
  Object.freeze(['src/features/prompts/assembler/base-section-builder.js', 'assets/recovered/features/prompts/assembler/base-section-builder.js']),
  Object.freeze(['src/features/prompts/assembler/ejs-template-renderer.js', 'assets/recovered/features/prompts/assembler/ejs-template-renderer.js']),
  Object.freeze(['src/features/prompts/assembler/history-context-builder.js', 'assets/recovered/features/prompts/assembler/history-context-builder.js']),
  Object.freeze(['src/features/prompts/assembler/prompt-variable-operations.js', 'assets/recovered/features/prompts/assembler/prompt-variable-operations.js']),
  Object.freeze(['src/features/prompts/assembler/world-info-placement.js', 'assets/recovered/features/prompts/assembler/world-info-placement.js']),
  Object.freeze(['src/features/state/initial-variable-diagnostics.js', 'assets/recovered/features/state/initial-variable-diagnostics.js']),
  Object.freeze(['src/features/state/initial-variable-parser.js', 'assets/recovered/features/state/initial-variable-parser.js']),
  Object.freeze(['src/features/world-info/embedding/embedding-index-sync.js', 'assets/recovered/features/world-info/embedding/embedding-index-sync.js']),
  Object.freeze(['src/features/world-info/embedding/embedding-math.js', 'assets/recovered/features/world-info/embedding/embedding-math.js']),
  Object.freeze(['src/features/world-info/embedding/embedding-provider-registry.js', 'assets/recovered/features/world-info/embedding/embedding-provider-registry.js']),
  Object.freeze(['src/features/world-info/embedding/embedding-sync-journal.js', 'assets/recovered/features/world-info/embedding/embedding-sync-journal.js']),
  Object.freeze(['src/features/world-info/embedding/embedding-text.js', 'assets/recovered/features/world-info/embedding/embedding-text.js']),
  Object.freeze(['src/features/world-info/embedding/local-model-cache.js', 'assets/recovered/features/world-info/embedding/local-model-cache.js']),
  Object.freeze(['src/features/world-info/embedding/local-model-runtime.js', 'assets/recovered/features/world-info/embedding/local-model-runtime.js']),
  Object.freeze(['src/app/persistence/backup/backup-constants.js', 'assets/m5/app/persistence/backup/backup-constants.js']),
  Object.freeze(['src/app/persistence/backup/backup-validator.js', 'assets/m5/app/persistence/backup/backup-validator.js']),
  Object.freeze(['src/app/persistence/backup/recovery-journal.js', 'assets/m5/app/persistence/backup/recovery-journal.js']),
  Object.freeze(['src/app/persistence/backup/recovery-snapshot-store.js', 'assets/m5/app/persistence/backup/recovery-snapshot-store.js']),
  Object.freeze(['src/app/persistence/backup/restore-lock.js', 'assets/m5/app/persistence/backup/restore-lock.js']),
  Object.freeze(['src/app/persistence/backup/restore-write-guard.js', 'assets/m5/app/persistence/backup/restore-write-guard.js']),
  Object.freeze(['src/app/persistence/backup/rollback-service.js', 'assets/m5/app/persistence/backup/rollback-service.js']),
  Object.freeze(['src/app/persistence/backup/settings-snapshot.js', 'assets/m5/app/persistence/backup/settings-snapshot.js']),
  Object.freeze(['src/app/composition/conversation-composition.js', 'assets/recovered/app/composition/conversation-composition.js']),
  Object.freeze(['src/app/composition/persistence-composition.js', 'assets/recovered/app/composition/persistence-composition.js']),
  Object.freeze(['src/app/composition/provider-composition.js', 'assets/recovered/app/composition/provider-composition.js']),
  Object.freeze(['src/app/composition/runtime-composition.js', 'assets/recovered/app/composition/runtime-composition.js']),
  Object.freeze(['src/app/composition/store-composition.js', 'assets/recovered/app/composition/store-composition.js']),
  Object.freeze(['src/app/composition/ui-composition.js', 'assets/recovered/app/composition/ui-composition.js']),
]);
export const vendorAssets = Object.freeze([
  'assets/ejs.min-Cthf3_XD.js',
  'assets/index-CsumjV7z.css',
  'assets/index-yS4Vru8B.js',
  'assets/jszip.min-CF4xG0Dr.js',
  'assets/lodash.min-xZXeUb-0.js',
  'assets/ui-d8367f0f.css',
]);
export const generatedAssets = Object.freeze([entryOutput, productionOutput, ...copiedAssets.map(([, output]) => output)]);
export const deploymentRoots = Object.freeze(['index.html', 'assets', 'scripts', 'api-unavailable.json', 'version.json', '_redirects', '_headers']);
// Relocate only entry import specifiers and the explicit legacy production URL.
export function renderEntry(source) {
  const outputs = new Map([...copiedAssets, [hostSource, productionOutput], [productionOutput, productionOutput]]);
  const relocate = specifier => {
    const [pathname, query] = specifier.split('?');
    const target = posix.normalize(posix.join(posix.dirname(entrySource), pathname));
    const output = outputs.get(target);
    assert.ok(output, 'Unmapped entry dependency: ' + specifier);
    const relative = posix.relative(posix.dirname(entryOutput), output);
    return (relative.startsWith('.') ? relative : './' + relative) + (query === undefined ? '' : '?' + query);
  };
  return source.replace(/(^import[^\n]*? from ')([^']+)(';)$/gm, (_, prefix, specifier, suffix) => prefix + relocate(specifier) + suffix)
    .replace(/(new URL\(')([^']+)(', import\.meta\.url\))/g, (_, prefix, specifier, suffix) => prefix + relocate(specifier) + suffix);
}
// The recovered host owns the application body. Only its module specifiers
// are relocated to the portable deployment layout; no code patching is done.
export const hostBanner = `/* GENERATED FILE. DO NOT EDIT DIRECTLY.
   Source: src/app/host.js
   Build pipeline: build/build-production-bundle.mjs
   Module path relocation only. Historical transforms are not executed.
*/\n`;
function relocateModuleSpecifier(source, output, specifier) {
  assert.ok(specifier.startsWith('.'), 'Unmapped bare module specifier in portable source: ' + source + ' -> ' + specifier);
  const outputs = new Map(copiedAssets);
  const [pathname, query] = specifier.split('?');
  const target = posix.normalize(posix.join(posix.dirname(source), pathname));
  const destination = outputs.get(target) || (generatedAssets.includes(target) || vendorAssets.includes(target) ? target : null);
  assert.ok(destination, 'Unmapped module dependency: ' + source + ' -> ' + specifier);
  const relative = posix.relative(posix.dirname(output), destination);
  return (relative.startsWith('.') ? relative : './' + relative) + (query === undefined ? '' : '?' + query);
}
export function renderOwnedModule(source, output, code) {
  const relocate = specifier => relocateModuleSpecifier(source, output, specifier);
  return code.replace(/(^(?:import|export)\s+(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s*["'])([^"']+)(["'];)/gm, (_, prefix, specifier, suffix) => prefix + relocate(specifier) + suffix)
    .replace(/(\bimport\(["'])(\.{1,2}\/[^"']+)(["']\))/g, (_, prefix, specifier, suffix) => prefix + relocate(specifier) + suffix);
}
export function renderHost(source) {
  return hostBanner + renderOwnedModule(hostSource, productionOutput, source);
}
export async function emitOwnedAssets() {
  for (const [source, output] of copiedAssets) {
    if (output === runtimeRendererOutput) continue; // emitted by Card Runtime builder
    await mkdir(new URL('./', file(output)), {recursive:true});
    if (source.endsWith('.js')) await writeFile(file(output), renderOwnedModule(source, output, await readFile(file(source), 'utf8')));
    else await copyFile(file(source), file(output));
  }
  await writeFile(file(entryOutput), renderEntry(await readFile(file(entrySource), 'utf8')));
}
async function listFiles(directory) {
  const entries = await readdir(file(directory), {withFileTypes:true});
  return (await Promise.all(entries.map(entry => {
    const name = directory + '/' + entry.name;
    if (entry.isDirectory()) return listFiles(name);
    assert.ok(entry.isFile(), 'Unexpected non-file asset: ' + name);
    return [name];
  }))).flat();
}
export async function verifyAssetInventory() {
  const expected = [...generatedAssets, ...vendorAssets];
  assert.equal(new Set(expected).size, expected.length, 'Duplicate output owner');
  assert.deepEqual((await listFiles('assets')).sort(), expected.sort(), 'Asset inventory mismatch');
  for (const [source, output] of copiedAssets) {
    if (source.endsWith('.js') && output !== runtimeRendererOutput) assert.equal(await readFile(file(output), 'utf8'), renderOwnedModule(source, output, await readFile(file(source), 'utf8')), 'Generated asset drift: ' + output);
    else assert.deepEqual(await readFile(file(output)), await readFile(file(source)), 'Generated asset drift: ' + output);
  }
  assert.equal(await readFile(file(entryOutput), 'utf8'), renderEntry(await readFile(file(entrySource), 'utf8')), 'Generated entry drift');
  assert.equal(await readFile(file(productionOutput), 'utf8'), renderHost(await readFile(file(hostSource), 'utf8')), 'Generated host drift');
}
