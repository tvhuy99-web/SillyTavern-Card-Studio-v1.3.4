import * as __stsArenaState from "../../../../m5/features/arena/state-machine.js";
import { createArenaResponsePanel as __stsCreateArenaResponsePanel } from "../../../features/arena/ui/arena-response-panel.js";
import { createArenaResponseSide as __stsCreateArenaResponseSide } from "../../../features/arena/ui/arena-response-side.js";
import { createChatMessage as __stsCreateChatMessage } from "../../../features/chat/ui/messages/chat-message.js";
import { createMessageList as __stsCreateMessageList } from "../../../features/chat/ui/messages/message-list.js";
import { createReadAloudButton as __stsCreateReadAloudButton } from "../../../features/chat/ui/messages/read-aloud-button.js";
import { createStreamingThinkingPanel as __stsCreateStreamingThinkingPanel } from "../../../features/chat/ui/messages/thinking-panel.js";
import { createLiveStreamText as __stsCreateLiveStreamText } from "../../../features/chat/ui/streaming/live-stream-text.js";
import { createStreamingHtmlPreview as __stsCreateStreamingHtmlPreview } from "../../../features/chat/ui/streaming/streaming-html-preview.js";
import { createCardFrame as __stsCreateCardFrame } from "../../../ui/card-runtime/card-frame.js";
import { createChatComposer as __stsCreateChatComposer } from "../../../features/chat/ui/chat-composer.js";
import { createTokenCountControl as __stsCreateTokenCountControl, createMessageMenu as __stsCreateMessageMenu, createThinkingPanel as __stsCreateThinkingPanel, createChatVisualEffects as __stsCreateChatVisualEffects } from "../../../features/chat/ui/chat-controls.js";
import { createImmersiveContainer as __stsCreateImmersiveContainer, createLoadOlderButton as __stsCreateLoadOlderButton } from "../../../../m6/ui/components/recovered-primitives.js";
import { inspectInitialVariablePipeline as __stsInspectInitialVariablePipeline } from '../../../../initial-variable-service-v1.3.6.js';
import { liveStreamStore as __stsLiveStreamStore } from '../../../../m4/features/chat/live-stream-store.js';
import { buildCardRuntimeRendererScript as __stsBuildCardRuntimeRendererScript, normalizeCardRuntimeMarkup as __stsNormalizeCardRuntimeMarkup } from '../../../../card-runtime-renderer-v1.3.6.js';
import { extractStoryContent } from '../../../../m4/features/prompts/story-content.js';

export function composeMessageViewUi({
  React, jsxRuntime, characterStore, lorebookStore,
  presetStore, personaStore, buildVariableScopes, readCardRuntimeEngineMode,
  escapeHtmlAttribute, toRuntimeMessages, replaceFrameTemplates, readScopedFrameStorage,
  buildFrameSmartStateBlock, readCardRuntimeCompatibilityMode, serializeElementAttributes, __stsBuildCardRuntimeCoreScript,
  cardRuntimeCompatibilityEvent, baseFrameLibrariesHtml, baseFrameImportMap, relaxedJson,
  cardRuntimeEngineEvent, serializeInlineJson, updatedFrameImportMap, updatedFrameLibrariesHtml,
  markdownParser, htmlSanitizer, truncateText, slashCommandHints
}, {
  Icon, useToast, useSpeech, LoadingIndicator
}) {
  var CardFrame=__stsCreateCardFrame(React,()=>({react: React, jsxRuntime, characterStore, lorebookStore, presetStore, personaStore, formatCardChatHistory: toRuntimeMessages, getCompatibilityMode: readCardRuntimeCompatibilityMode, replaceFrameTemplates: replaceFrameTemplates, buildVariableScopes: buildVariableScopes, serializeElementAttributes: serializeElementAttributes, escapeHtmlAttribute: escapeHtmlAttribute, serializeInlineJson: serializeInlineJson, getRuntimeEngineMode: readCardRuntimeEngineMode, readScopedFrameStorage: readScopedFrameStorage, buildCardRuntimeCoreScript: __stsBuildCardRuntimeCoreScript, buildCardRuntimeRendererScript: __stsBuildCardRuntimeRendererScript, inspectInitialVariablePipeline: __stsInspectInitialVariablePipeline, normalizeCardRuntimeMarkup: __stsNormalizeCardRuntimeMarkup, compatibilityModeEvent: cardRuntimeCompatibilityEvent, buildFrameSmartStateBlock: buildFrameSmartStateBlock, officialFrameImportMap: updatedFrameImportMap, yamlParser: relaxedJson, runtimeEngineModeEvent: cardRuntimeEngineEvent, legacyFrameImportMap: baseFrameImportMap, officialFrameLibrariesHtml: updatedFrameLibrariesHtml, legacyFrameLibrariesHtml: baseFrameLibrariesHtml}));
  CardFrame.displayName="InteractiveHtmlMessage";
  var StreamingHtmlPreview=__stsCreateStreamingHtmlPreview(()=>({react: React, jsxRuntime}));
  var MessageMenu=__stsCreateMessageMenu(()=>({react: React, Icon: Icon, jsxRuntime}));
  var ThinkingPanel=__stsCreateThinkingPanel(()=>({react: React, Icon: Icon, jsxRuntime}));
  var __stsLiveStreamText=__stsCreateLiveStreamText(()=>({react: React, jsxRuntime, liveStreamStore: __stsLiveStreamStore}));
  var StreamingThinkingPanel=__stsCreateStreamingThinkingPanel(()=>({react: React, jsxRuntime, markdownParser: markdownParser, ThinkingBlock: ThinkingPanel, htmlSanitizer: htmlSanitizer, LiveStreamText: __stsLiveStreamText}));
  var ArenaResponseSide=__stsCreateArenaResponseSide(React,()=>({react: React, jsxRuntime, StreamingThinkingPanel: StreamingThinkingPanel, arenaState: __stsArenaState, Icon: Icon}));
  var ArenaResponsePanel=__stsCreateArenaResponsePanel(()=>({jsxRuntime, ArenaResponseSide: ArenaResponseSide}));
  var ChatMessage=__stsCreateChatMessage(React,()=>({react: React, jsxRuntime, useToast, personaStore, markdownParser: markdownParser, ThinkingBlock: ThinkingPanel, MessageActionMenu: MessageMenu, htmlSanitizer: htmlSanitizer, LiveStreamText: __stsLiveStreamText, Icon: Icon, useSpeech: useSpeech, ArenaResponsePanel: ArenaResponsePanel}));
  var ReadAloudButton=__stsCreateReadAloudButton(()=>({jsxRuntime, useToast, extractStoryContent: extractStoryContent, Icon: Icon, useSpeech: useSpeech}));
  var MessageList=__stsCreateMessageList(React,()=>({react: React, jsxRuntime, getCompatibilityMode: readCardRuntimeCompatibilityMode, StreamingHtmlPreview: StreamingHtmlPreview, ThinkingBlock: ThinkingPanel, getRuntimeEngineMode: readCardRuntimeEngineMode, MessageActionMenu: MessageMenu, compatibilityModeEvent: cardRuntimeCompatibilityEvent, CardFrame: CardFrame, runtimeEngineModeEvent: cardRuntimeEngineEvent, LoadingIndicator: LoadingIndicator, ChatMessage: ChatMessage, useSpeech: useSpeech, ReadAloudButton: ReadAloudButton}));
  var ChatComposer=__stsCreateChatComposer(()=>({react: React, jsxRuntime, truncateText: truncateText, Icon: Icon, LoadingIndicator: LoadingIndicator, slashCommandHints: slashCommandHints}));
  var ImmersiveContainer=__stsCreateImmersiveContainer(jsxRuntime);
  var ChatVisualEffects=__stsCreateChatVisualEffects(()=>({react: React, jsxRuntime}));
  var formatTimestamp=timestamp=>{let date=new Date(timestamp);return`${date.getHours().toString().padStart(2,"0")}:${date.getMinutes().toString().padStart(2,"0")}:${date.getSeconds().toString().padStart(2,"0")}`};
  var LoadOlderButton=__stsCreateLoadOlderButton(jsxRuntime);
  var TokenCountControl=__stsCreateTokenCountControl(()=>({react: React, Icon: Icon, jsxRuntime}));
  return {
    CardFrame, StreamingHtmlPreview, MessageMenu, ThinkingPanel,
    __stsLiveStreamText, StreamingThinkingPanel, ArenaResponseSide, ArenaResponsePanel,
    ChatMessage, ReadAloudButton, MessageList, ChatComposer,
    ImmersiveContainer, ChatVisualEffects, formatTimestamp, LoadOlderButton,
    TokenCountControl
  };
}
