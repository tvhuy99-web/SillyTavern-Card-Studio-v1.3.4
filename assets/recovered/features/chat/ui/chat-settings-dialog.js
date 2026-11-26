export function createChatSettingsDialog(getDependencies) {
  return function ChatSettingsDialog({
    isOpen,
    onClose,
    visualState,
    onUpdate,
    isHUDOpen,
    onToggleHUD,
    isStatusHUDOpen,
    onToggleStatusHUD,
  }) {
    const {
      useDialogFocus,
      react,
      Icon,
      jsxRuntime,
      ToggleSwitch,
    } = getDependencies();

    const dialogRef = react.useRef(null);
    const closeButtonRef = react.useRef(null);
    useDialogFocus(isOpen, onClose, dialogRef, closeButtonRef);

    if (!isOpen) return null;

    return jsxRuntime.jsxs('div', {
      ref: dialogRef,
      className: 'absolute top-14 right-4 w-80 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl z-50  p-4 max-h-[80vh] overflow-y-auto custom-scrollbar',
      role: 'dialog',
      'aria-modal': true,
      'aria-labelledby': 'chat-settings-title',
      children: [
        jsxRuntime.jsxs('div', {
          className: 'flex justify-between items-center mb-4 border-b border-slate-700 pb-2',
          children: [
            jsxRuntime.jsx('h3', {
              id: 'chat-settings-title',
              className: 'font-bold text-slate-200',
              children: 'Cài đặt Trò chuyện',
            }),
            jsxRuntime.jsx('button', {
              ref: closeButtonRef,
              onClick: onClose,
              className: 'text-slate-400 hover:text-white',
              'aria-label': 'Đóng cài đặt',
              children: jsxRuntime.jsx(Icon, { name: 'close', className: 'h-4 w-4' }),
            }),
          ],
        }),
        jsxRuntime.jsxs('div', {
          className: 'space-y-6',
          children: [
            jsxRuntime.jsxs('div', {
              className: 'space-y-3',
              children: [
                jsxRuntime.jsx('h4', {
                  className: 'text-xs font-bold text-indigo-400 uppercase tracking-wider border-b border-slate-700/50 pb-1',
                  children: 'Công cụ hiển thị',
                }),
                onToggleHUD && jsxRuntime.jsx(ToggleSwitch, {
                  label: 'Bảng Gỡ lỗi (Debug Panel)',
                  checked: Boolean(isHUDOpen),
                  onChange: () => onToggleHUD(),
                  clean: true,
                }),
                onToggleStatusHUD && jsxRuntime.jsx(ToggleSwitch, {
                  label: 'Giao diện Thẻ nổi (Floating HUD)',
                  checked: Boolean(isStatusHUDOpen),
                  onChange: () => onToggleStatusHUD(),
                  clean: true,
                }),
                jsxRuntime.jsx(ToggleSwitch, {
                  label: 'Chế độ Văn bản thuần',
                  checked: Boolean(visualState.disableInteractiveMode),
                  onChange: checked => onUpdate('disableInteractiveMode', checked),
                  clean: true,
                  tooltip: 'Tắt xử lý Regex/Script/HTML. Hiển thị nội dung thô nguyên bản trong bong bóng chat.',
                }),
              ],
            }),
            jsxRuntime.jsxs('div', {
              className: 'space-y-4',
              children: [
                jsxRuntime.jsx('h4', {
                  className: 'text-xs font-bold text-sky-400 uppercase tracking-wider border-b border-slate-700/50 pb-1',
                  children: 'Giao diện & Hình ảnh',
                }),
                jsxRuntime.jsxs('div', {
                  children: [
                    jsxRuntime.jsx('label', {
                      className: 'block text-xs font-medium text-slate-400 mb-1',
                      children: 'Link Hình nền (URL)',
                    }),
                    jsxRuntime.jsx('input', {
                      type: 'text',
                      value: visualState.backgroundImage || '',
                      'aria-label': 'Link hình nền',
                      onChange: event => onUpdate('bg', event.target.value),
                      placeholder: 'https://...',
                      className: 'w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-xs text-slate-200 focus:border-sky-500 focus:outline-none',
                    }),
                    jsxRuntime.jsx('button', {
                      onClick: () => onUpdate('bg', 'off'),
                      className: 'text-xs text-red-400 mt-1 hover:underline',
                      children: 'Xóa nền',
                    }),
                  ],
                }),
                jsxRuntime.jsxs('div', {
                  children: [
                    jsxRuntime.jsx('label', {
                      className: 'block text-xs font-medium text-slate-400 mb-1',
                      children: 'Link Nhạc nền (URL)',
                    }),
                    jsxRuntime.jsx('input', {
                      type: 'text',
                      value: visualState.musicUrl || '',
                      'aria-label': 'Link nhạc nền',
                      onChange: event => onUpdate('music', event.target.value),
                      placeholder: 'https://... (mp3/ogg)',
                      className: 'w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-xs text-slate-200 focus:border-sky-500 focus:outline-none',
                    }),
                    jsxRuntime.jsx('button', {
                      onClick: () => onUpdate('music', 'off'),
                      className: 'text-xs text-red-400 mt-1 hover:underline',
                      children: 'Tắt nhạc',
                    }),
                  ],
                }),
                jsxRuntime.jsxs('div', {
                  children: [
                    jsxRuntime.jsx('label', {
                      className: 'block text-xs font-medium text-slate-400 mb-1',
                      children: 'Hiệu ứng CSS Global',
                    }),
                    jsxRuntime.jsx('input', {
                      type: 'text',
                      value: visualState.globalClass || '',
                      'aria-label': 'Hiệu ứng CSS Global',
                      onChange: event => onUpdate('class', event.target.value),
                      placeholder: 'grayscale, blur-sm, sepia...',
                      className: 'w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-xs text-slate-200 focus:border-sky-500 focus:outline-none',
                    }),
                  ],
                }),
              ],
            }),
            jsxRuntime.jsxs('div', {
              className: 'space-y-4',
              children: [
                jsxRuntime.jsxs('div', {
                  className: 'flex items-center justify-between border-b border-slate-700/50 pb-1',
                  children: [
                    jsxRuntime.jsx('h4', {
                      className: 'text-xs font-bold text-amber-400 uppercase tracking-wider',
                      children: 'Cấu hình Âm thanh',
                    }),
                    jsxRuntime.jsx(ToggleSwitch, {
                      checked: visualState.systemSoundEnabled !== false,
                      ariaLabel: 'Bật âm thanh hệ thống',
                      onChange: checked => onUpdate('systemSoundEnabled', checked),
                      clean: true,
                      className: 'scale-90 origin-right',
                    }),
                  ],
                }),
                jsxRuntime.jsxs('div', {
                  className: visualState.systemSoundEnabled === false ? 'opacity-50 pointer-events-none' : '',
                  children: [
                    jsxRuntime.jsxs('div', {
                      className: 'mb-3',
                      children: [
                        jsxRuntime.jsx('label', {
                          className: 'block text-xs font-medium text-slate-400 mb-1',
                          children: 'Âm thanh AI Xong (URL)',
                        }),
                        jsxRuntime.jsx('input', {
                          type: 'text',
                          value: visualState.aiSoundUrl || '',
                          'aria-label': 'Âm thanh AI xong',
                          onChange: event => onUpdate('aiSoundUrl', event.target.value),
                          placeholder: "Mặc định: 'Pop'",
                          className: 'w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-xs text-slate-200 focus:border-sky-500 focus:outline-none',
                        }),
                      ],
                    }),
                    jsxRuntime.jsxs('div', {
                      children: [
                        jsxRuntime.jsx('label', {
                          className: 'block text-xs font-medium text-slate-400 mb-1',
                          children: 'Âm thanh RPG Xong (URL)',
                        }),
                        jsxRuntime.jsx('input', {
                          type: 'text',
                          value: visualState.rpgSoundUrl || '',
                          'aria-label': 'Âm thanh RPG xong',
                          onChange: event => onUpdate('rpgSoundUrl', event.target.value),
                          placeholder: "Mặc định: 'Magic Chime'",
                          className: 'w-full bg-slate-900 border border-slate-700 rounded-md p-2 text-xs text-slate-200 focus:border-sky-500 focus:outline-none',
                        }),
                      ],
                    }),
                    jsxRuntime.jsx('p', {
                      className: 'text-[10px] text-slate-500 mt-2 italic',
                      children: 'Để trống để sử dụng âm thanh mặc định của hệ thống.',
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    });
  };
}
