export function createReadAloudButton(getDependencies) {
  return function ReadAloudButton({
    rawContent,
    voice,
    provider,
    rate,
    pitch,
    nativeVoice,
  }) {
    const {
      extractStoryContent,
      useToast,
      Icon,
      useSpeech,
      jsxRuntime,
    } = getDependencies();
    const { showToast } = useToast();
    const { playImmediately } = useSpeech();

    const handleReadAloud = async () => {
      const cleanText = extractStoryContent(rawContent).replace(/<[^>]*>/g, '');
      if (!cleanText.trim()) {
        showToast('Không có nội dung văn bản để đọc.', 'warning');
        return;
      }
      try {
        playImmediately(
          cleanText,
          provider === 'native' ? nativeVoice : voice,
          `interactive-${Date.now()}`,
          { provider, rate, pitch },
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        showToast(`TTS Error: ${errorMessage}`, 'error');
      }
    };

    return jsxRuntime.jsx('button', {
      onClick: handleReadAloud,
      className: 'p-1.5 rounded-full shadow-lg border    bg-slate-800/90 text-slate-400 hover:text-sky-400 hover:border-sky-500 ',
      title: 'Đọc nội dung (TTS)',
      'aria-label': 'Đọc nội dung (TTS)',
      children: jsxRuntime.jsx(Icon, {
        name: 'volume',
        className: 'h-4 w-4',
      }),
    });
  };
}
