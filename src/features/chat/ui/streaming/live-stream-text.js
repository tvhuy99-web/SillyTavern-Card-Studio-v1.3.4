export function createLiveStreamText(getDependencies) {
  return function LiveStreamText({ messageId, slot = 'main', fallback = '' }) {
    const { liveStreamStore, react, jsxRuntime } = getDependencies();
    const readContent = () => liveStreamStore.getSnapshot(messageId, slot).content;
    const [content, setContent] = react.useState(readContent);

    react.useEffect(() => {
      const update = () => setContent(readContent());
      const unsubscribe = liveStreamStore.subscribe(messageId, slot, update);
      update(); // Catch a chunk published between mount and subscription.
      return unsubscribe;
    }, [messageId, slot]);

    return jsxRuntime.jsxs('div', {
      className: 'whitespace-pre-wrap font-sans text-sm leading-relaxed',
      'aria-live': 'off',
      children: [
        content || fallback,
        jsxRuntime.jsx('span', {
          className: ' text-sky-400',
          'aria-hidden': 'true',
          children: '▍',
        }),
      ],
    });
  };
}
