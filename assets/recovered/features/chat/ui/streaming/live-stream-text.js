export function createLiveStreamText(getDependencies) {
  return function LiveStreamText({ messageId, slot = 'main', fallback = '' }) {
    const { liveStreamStore, react, jsxRuntime } = getDependencies();
    const [streamSnapshot, setStreamSnapshot] = react.useState(
      () => liveStreamStore.getSnapshot(messageId, slot),
    );

    react.useEffect(
      () => liveStreamStore.subscribe(
        messageId,
        slot,
        () => setStreamSnapshot(liveStreamStore.getSnapshot(messageId, slot)),
      ),
      [messageId, slot],
    );

    return jsxRuntime.jsxs('div', {
      className: 'whitespace-pre-wrap font-sans text-sm leading-relaxed',
      children: [
        streamSnapshot.content || fallback,
        jsxRuntime.jsx('span', {
          className: ' text-sky-400',
          children: '▍',
        }),
      ],
    });
  };
}
