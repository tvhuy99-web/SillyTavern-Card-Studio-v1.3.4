export function createChatDialogs(getDependencies) {
  return function ChatDialogs({
    isAuthorNoteOpen,
    setIsAuthorNoteOpen,
    authorNote,
    updateAuthorNote,
    isWorldInfoOpen,
    setIsWorldInfoOpen,
    worldInfoEntries,
    worldInfoState,
    worldInfoPinned,
    worldInfoPlacement,
    updateWorldInfoState,
    updateWorldInfoPinned,
    updateWorldInfoPlacement,
    isLorebookCreatorOpen,
    setIsLorebookCreatorOpen,
    lorebookKeyword,
    setLorebookKeyword,
    lorebooks,
    characterId,
  }) {
    const {
      isProxyForToolsEnabled,
      AuthorNoteDialog,
      WorldInfoDialog,
      callProxyToolModel,
      useDialogFocus,
      aiStudioToolText,
      defaultGeminiSafetySettings,
      react,
      callGeminiToolModel,
      LorebookGeneratorModal,
      getConnectionSettings,
      jsxRuntime,
    } = getDependencies();

    const [isResultModalOpen, setIsResultModalOpen] = react.useState(false);
    const [generationPromise, setGenerationPromise] = react.useState(Promise.resolve(''));
    const [submittedKeyword, setSubmittedKeyword] = react.useState('');
    const [isKeywordPromptOpen, setIsKeywordPromptOpen] = react.useState(false);
    const keywordDialogRef = react.useRef(null);
    const keywordInputRef = react.useRef(null);

    useDialogFocus(isKeywordPromptOpen, () => setIsLorebookCreatorOpen(false), keywordDialogRef, keywordInputRef);

    react.useEffect(() => {
      if (isLorebookCreatorOpen && !isResultModalOpen && !isKeywordPromptOpen) {
        setIsKeywordPromptOpen(true);
      }
    }, [isLorebookCreatorOpen]);

    react.useEffect(() => {
      if (!isLorebookCreatorOpen) {
        setIsKeywordPromptOpen(false);
        setIsResultModalOpen(false);
      }
    }, [isLorebookCreatorOpen]);

    const generateLorebookEntry = async keyword => {
      const prompt = `Dựa trên lịch sử hội thoại, hãy viết một mục từ điển (Lorebook) chi tiết cho từ khóa "${keyword}".\n\nNhân vật: ${lorebooks.length > 0 ? lorebooks[0].name : 'Character'}`;
      const settings = getConnectionSettings();
      let generatedText = '';

      if (settings.source === 'aistudio') {
        generatedText = await aiStudioToolText(
          prompt,
          settings.aistudio_tool_model || settings.aistudio_model || 'gemini-2.5-flash',
        );
      } else if (isProxyForToolsEnabled()) {
        generatedText = await callProxyToolModel(
          prompt,
          settings.proxy_model || settings.proxy_tool_model || 'gemini-3.1-pro-preview',
          settings.proxy_protocol,
        );
      } else {
        const response = await callGeminiToolModel(
          'gemini-3.1-pro-preview',
          prompt,
          { temp: 0.7 },
          defaultGeminiSafetySettings,
        );
        generatedText = response.text || '';
      }
      return generatedText.trim();
    };

    const handleCreateLorebookEntry = () => {
      const trimmedKeyword = lorebookKeyword.trim();
      if (!trimmedKeyword) {
        alert('Vui lòng nhập từ khóa.');
        return;
      }
      const pendingPromise = generateLorebookEntry(trimmedKeyword);
      setSubmittedKeyword(trimmedKeyword);
      setGenerationPromise(pendingPromise);
      setIsResultModalOpen(true);
      setIsKeywordPromptOpen(false);
      setLorebookKeyword('');
    };

    return jsxRuntime.jsxs(jsxRuntime.Fragment, {
      children: [
        jsxRuntime.jsx(AuthorNoteDialog, {
          isOpen: isAuthorNoteOpen,
          initialNote: authorNote,
          onSave: nextNote => {
            updateAuthorNote(nextNote);
            setIsAuthorNoteOpen(false);
          },
          onClose: () => setIsAuthorNoteOpen(false),
        }),
        jsxRuntime.jsx(WorldInfoDialog, {
          isOpen: isWorldInfoOpen,
          onClose: () => setIsWorldInfoOpen(false),
          entries: worldInfoEntries,
          worldInfoState,
          worldInfoPinned,
          worldInfoPlacement,
          onUpdate: updateWorldInfoState,
          onUpdatePinned: updateWorldInfoPinned,
          onUpdatePlacement: updateWorldInfoPlacement,
          characterId,
        }),
        isKeywordPromptOpen && jsxRuntime.jsx('div', {
          className: 'fixed inset-0 bg-black/60  flex items-center justify-center z-[100] p-4',
          onClick: () => setIsLorebookCreatorOpen(false),
          role: 'dialog',
          'aria-modal': 'true',
          'aria-labelledby': 'ai-lorebook-title',
          children: jsxRuntime.jsxs('div', {
            ref: keywordDialogRef,
            className: 'bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md p-6',
            onClick: event => event.stopPropagation(),
            children: [
              jsxRuntime.jsx('h3', {
                id: 'ai-lorebook-title',
                className: 'text-lg font-bold text-sky-400 mb-4',
                children: 'Tạo Mục Sổ tay AI',
              }),
              jsxRuntime.jsxs('div', {
                className: 'space-y-4',
                children: [
                  jsxRuntime.jsx('input', {
                    ref: keywordInputRef,
                    type: 'text',
                    value: lorebookKeyword,
                    onChange: event => setLorebookKeyword(event.target.value),
                    placeholder: 'Nhập từ khóa hoặc tên mục...',
                    'aria-label': 'Nhập từ khóa',
                    className: 'w-full bg-slate-900 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-1 focus:ring-sky-500',
                    autoFocus: true,
                  }),
                  jsxRuntime.jsxs('div', {
                    className: 'flex gap-2 justify-end',
                    children: [
                      jsxRuntime.jsx('button', {
                        onClick: () => setIsLorebookCreatorOpen(false),
                        className: 'text-sm bg-slate-700 hover:bg-slate-600 text-white font-semibold py-2 px-4 rounded-md ',
                        children: 'Hủy',
                      }),
                      jsxRuntime.jsx('button', {
                        onClick: handleCreateLorebookEntry,
                        className: 'text-sm bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-4 rounded-md ',
                        children: 'Tạo',
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
        }),
        jsxRuntime.jsx(LorebookGeneratorModal, {
          isOpen: isResultModalOpen,
          onClose: () => {
            setIsResultModalOpen(false);
            setIsLorebookCreatorOpen(false);
          },
          keyword: submittedKeyword,
          contentPromise: generationPromise,
        }),
      ],
    });
  };
}
