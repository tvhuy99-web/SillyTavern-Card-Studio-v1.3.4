export function createChatRoute({ jsx }, { ChatSession, SessionList }) {
  return function ChatRoute({ activeSessionId, onSessionSelect, onCloseSession }) {
    return activeSessionId ? jsx(ChatSession, { sessionId: activeSessionId, onBack: onCloseSession }) : jsx(SessionList, { onSessionSelect });
  };
}
