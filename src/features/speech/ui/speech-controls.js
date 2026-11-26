export function createSpeechControls(getDependencies) {
  return function SpeechControls() {
    const { Icon, useSpeech, jsxRuntime } = getDependencies();
    const {
      isPlaying,
      isPaused,
      autoPlayEnabled,
      toggleAutoPlay,
      togglePause,
      skip,
      isLoading,
      settings: speechSettings,
    } = useSpeech();

    if (!speechSettings.tts_enabled) return null;

    return jsxRuntime.jsxs('div', {
      className: 'flex items-center bg-slate-800/80 rounded-full px-2 py-1 gap-1 border border-slate-600/50 mr-2',
      children: [
        jsxRuntime.jsx('button', {
          onClick: toggleAutoPlay,
          className: `p-1.5 rounded-full  ${
            autoPlayEnabled ? 'text-sky-400 bg-sky-900/20' : 'text-slate-500 hover:text-slate-300'
          }`,
          title: autoPlayEnabled ? 'Tự động đọc: BẬT' : 'Tự động đọc: TẮT',
          'aria-label': autoPlayEnabled ? 'Tắt tự động đọc' : 'Bật tự động đọc',
          'aria-pressed': autoPlayEnabled,
          children: jsxRuntime.jsx(Icon, { name: 'volume', className: 'h-4 w-4' }),
        }),
        (isPlaying || isPaused || isLoading) && jsxRuntime.jsxs(jsxRuntime.Fragment, {
          children: [
            jsxRuntime.jsx('div', { className: 'w-px h-3 bg-slate-600 mx-1' }),
            jsxRuntime.jsx('button', {
              onClick: togglePause,
              className: `p-1.5 rounded-full text-slate-200 hover:text-white hover:bg-slate-700  ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`,
              title: isPaused ? 'Tiếp tục' : 'Tạm dừng',
              'aria-label': isPaused ? 'Tiếp tục đọc' : 'Tạm dừng đọc',
              disabled: isLoading,
              children: isLoading
                ? jsxRuntime.jsx('span', { className: 'text-sm font-bold', children: '…' })
                : isPaused
                  ? jsxRuntime.jsx(Icon, { name: 'play', className: 'h-4 w-4' })
                  : jsxRuntime.jsx(Icon, { name: 'pause', className: 'h-4 w-4' }),
            }),
            jsxRuntime.jsx('button', {
              onClick: skip,
              className: 'p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 ',
              title: 'Bỏ qua (Next)',
              'aria-label': 'Bỏ qua câu hiện tại',
              children: jsxRuntime.jsx(Icon, { name: 'skip', className: 'h-4 w-4' }),
            }),
          ],
        }),
      ],
    });
  };
}
