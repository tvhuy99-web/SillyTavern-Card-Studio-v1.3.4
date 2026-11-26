function extractCardExtensionVariables(card, isPlainObject, deepMergeObject, yamlParser) {
  const extensions = isPlainObject(card.extensions) ? card.extensions : {};
  const merged = {};

  const mergeSource = source => {
    if (isPlainObject(source)) {
      deepMergeObject(merged, source);
    } else if (typeof source === 'string' && source.trim()) {
      try {
        const parsed = yamlParser.default.parse(source);
        if (isPlainObject(parsed)) {
          deepMergeObject(merged, parsed);
        }
      } catch {}
    }
  };

  mergeSource(extensions.TavernHelper_variables);
  mergeSource(extensions.tavern_helper_variables);

  if (Array.isArray(extensions.tavern_helper)) {
    extensions.tavern_helper.forEach(entry => {
      if (Array.isArray(entry) && /^(variables|variable)$/i.test(String(entry[0] || ''))) {
        mergeSource(entry[1]);
      }
    });
  } else if (isPlainObject(extensions.tavern_helper)) {
    mergeSource(extensions.tavern_helper.variables);
  }

  return merged;
}

function validateAdventureArchive(rawArchive, isRecordObject) {
  if (!isRecordObject(rawArchive) || !isRecordObject(rawArchive.data)) {
    throw new Error('File không hợp lệ: thiếu khối dữ liệu.');
  }
  const payload = rawArchive.data;
  if (!isRecordObject(payload.character) || !isRecordObject(payload.session)) {
    throw new Error('File không hợp lệ: thiếu dữ liệu phiên hoặc nhân vật.');
  }
  if (
    typeof payload.characterFileName !== 'string'
    || !payload.characterFileName.trim()
    || payload.characterFileName.length > 500
  ) {
    throw new Error('File không hợp lệ: tên tệp nhân vật không hợp lệ.');
  }
  if (
    typeof payload.session.sessionId !== 'string'
    || !payload.session.sessionId.trim()
    || payload.session.sessionId.length > 500
  ) {
    throw new Error('File không hợp lệ: mã phiên không hợp lệ.');
  }
  if (!Array.isArray(payload.session.chatHistory) || payload.session.chatHistory.length > 1000000) {
    throw new Error('File không hợp lệ: lịch sử chat không hợp lệ hoặc quá lớn.');
  }
  return rawArchive;
}

export function createSessionListScreen(getDependencies) {
  return function SessionListScreen({ onSessionSelect }) {
    const {
      executeVariableScript,
      personaStore,
      truncateText,
      deleteSessionRecord,
      expandBasicMacros,
      FileNameDialog,
      normalizeCharacterForSave,
      listSavedSessions,
      resolveCharacterName,
      isRecordObject,
      saveSessionRecord,
      expandRandomMacros,
      extractRegexScripts,
      diagnosticsState,
      mergeInitialVariableSources,
      repositories,
      sessionPersistence,
      StorySetupDialog,
      react,
      presetStore,
      resolveWorldInfo,
      CharacterLaunchCard,
      processRegex,
      AdventureImportDropzone,
      useToast,
      yamlParser,
      characterStore,
      deepMergeObject,
      LoadingIndicator,
      GreetingDialog,
      isPlainObject,
      SessionListItem,
      jsxRuntime,
    } = getDependencies();

    const [sessions, setSessions] = react.useState([]);
    const [isLoadingSessions, setIsLoadingSessions] = react.useState(true);
    const { characters, isLoading: isLoadingCharacters, reloadCharacters } = characterStore();
    const { presets, activePresetName, reloadPresets } = presetStore();
    const { activePersonaId, activePersona, personas, reloadPersonas } = personaStore();

    const [greetingTargetCharacter, setGreetingTargetCharacter] = react.useState(null);
    const [storyTargetCharacter, setStoryTargetCharacter] = react.useState(null);
    const [errorMessage, setErrorMessage] = react.useState('');
    const [isImportingArchive, setIsImportingArchive] = react.useState(false);
    const { showToast } = useToast();
    const [isExportDialogOpen, setIsExportDialogOpen] = react.useState(false);
    const [sessionToExport, setSessionToExport] = react.useState(null);

    const reloadSavedSessions = async () => {
      setIsLoadingSessions(true);
      try {
        const loadedSessions = await listSavedSessions();
        loadedSessions.sort((left, right) => right.lastUpdated - left.lastUpdated);
        setSessions(loadedSessions);
      } catch {
        setErrorMessage('Không thể tải các phiên trò chuyện đã lưu.');
      } finally {
        setIsLoadingSessions(false);
      }
    };

    react.useEffect(() => {
      reloadSavedSessions();
    }, []);

    const activePreset = presets.find(preset => preset.name === activePresetName);

    const handleDeleteSession = async sessionId => {
      try {
        await deleteSessionRecord(sessionId);
        diagnosticsState.drop(sessionId);
        setSessions(previous => previous.filter(item => item.sessionId !== sessionId));
      } catch {
        setErrorMessage('Không thể xóa phiên trò chuyện.');
      }
    };

    const handleStartNewSession = async (character, greetingTemplate) => {
      if (!activePreset) {
        setErrorMessage('Không có preset nào được chọn. Vui lòng chọn một preset trong tab Preset.');
        setGreetingTargetCharacter(null);
        return;
      }

      const sessionId = character.fileName;
      if (
        sessions.find(item => item.sessionId === sessionId)
        && !window.confirm(
          `Một cuộc trò chuyện với ${character.card.name} đã tồn tại. Bạn có muốn bắt đầu lại từ đầu và xóa cuộc trò chuyện cũ không?`,
        )
      ) {
        setGreetingTargetCharacter(null);
        return;
      }

      const userName = activePersona ? activePersona.name : 'User';
      const characterName = resolveCharacterName(character.card);
      const renderedGreeting = expandRandomMacros(expandBasicMacros(greetingTemplate, {
        card: character.card,
        userName,
        userPersonaDescription: activePersona?.description || '',
        userInput: '',
        messages: [],
      }));

      let {
        displayContent,
        interactiveHtml,
        interactiveHtmlBlocks,
        diagnosticLog,
      } = processRegex(renderedGreeting, character.card.extensions?.regex_scripts || [], [2], {
        isMarkdown: true,
        isPrompt: false,
        depth: 0,
        ...extractRegexScripts(undefined, activePreset),
        macros: { char: characterName, bot: characterName, user: userName },
      });

      const hasEnabledHelperScripts = character.card.extensions?.TavernHelper_scripts?.some(
        script => script?.type === 'script' && script?.value?.enabled,
      );
      if (hasEnabledHelperScripts && !interactiveHtml) {
        interactiveHtml = displayContent || renderedGreeting;
        interactiveHtmlBlocks = interactiveHtml ? [interactiveHtml] : [];
        displayContent = '';
        if (!interactiveHtml.trim()) {
          interactiveHtml = '<div></div>';
        }
      }

      let initialVariables = extractCardExtensionVariables(
        character.card,
        isPlainObject,
        deepMergeObject,
        yamlParser,
      );
      const mergedInit = mergeInitialVariableSources(
        initialVariables,
        character.card.char_book?.entries || [],
        renderedGreeting,
        text => yamlParser.default.parse(text),
      );
      initialVariables = mergedInit.variables;

      let finalVariables = initialVariables;
      try {
        finalVariables = (await executeVariableScript(renderedGreeting, initialVariables)).updatedVariables;
      } catch {}

      const { updatedRuntimeState: initialWorldInfoRuntime } = resolveWorldInfo(
        renderedGreeting,
        character.card.char_book?.entries || [],
        {},
        {},
        {},
      );

      const backgroundAssets = (character.card.assets || []).filter(
        asset => asset.type?.toLowerCase() === 'background',
      );
      const primaryBackground = backgroundAssets.find(asset => asset.name?.toLowerCase() === 'main')
        || backgroundAssets[0];
      const backgroundImageUrl = primaryBackground
        ? (character.card.__embedded_assets?.[primaryBackground.uri]
            || (/^(?:https:|data:|blob:)/i.test(primaryBackground.uri) ? primaryBackground.uri : undefined))
        : undefined;

      const initialHistory = [];
      const openingMessage = {
        id: `msg-start-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        role: 'model',
        content: displayContent.trim() ? displayContent : '',
        originalRawContent: renderedGreeting,
        contextState: JSON.parse(JSON.stringify(finalVariables)),
        timestamp: Date.now(),
      };
      if (interactiveHtml) {
        openingMessage.interactiveHtml = interactiveHtml;
        if (interactiveHtmlBlocks?.length) {
          openingMessage.interactiveHtmlBlocks = interactiveHtmlBlocks;
        }
      }

      if (openingMessage.content || openingMessage.interactiveHtml) {
        initialHistory.push(openingMessage);
      } else if (renderedGreeting) {
        initialHistory.push({
          id: `msg-start-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          role: 'model',
          content: renderedGreeting,
          contextState: JSON.parse(JSON.stringify(finalVariables)),
          timestamp: Date.now(),
        });
      }

      const newSessionRecord = {
        sessionId,
        characterFileName: character.fileName,
        presetName: activePreset.name,
        userPersonaId: activePersonaId,
        chatHistory: initialHistory,
        longTermSummaries: [],
        variables: finalVariables,
        worldInfoRuntime: initialWorldInfoRuntime,
        visualState: backgroundImageUrl ? { backgroundImage: backgroundImageUrl } : {},
        lastMessageSnippet: truncateText(displayContent || renderedGreeting || 'Bắt đầu cuộc trò chuyện...', 50),
        lastUpdated: Date.now(),
      };

      try {
        await saveSessionRecord(newSessionRecord);
        diagnosticsState.drop(sessionId);
        diagnosticsState.activate(sessionId);
        if (diagnosticLog) {
          diagnosticsState.addSystem({
            level: 'log',
            source: 'regex',
            message: String(diagnosticLog),
            timestamp: Date.now(),
          });
        }
        onSessionSelect(sessionId);
      } catch {
        setErrorMessage('Không thể tạo phiên trò chuyện mới.');
      }
      setGreetingTargetCharacter(null);
    };

    const handleImportAdventureArchive = async archiveFile => {
      setIsImportingArchive(true);
      setErrorMessage('');
      try {
        if (!archiveFile.size) {
          throw new Error('Tệp bản ghi trống.');
        }
        if (archiveFile.size > 100000000) {
          throw new Error('Tệp bản ghi vượt quá giới hạn 100 MB.');
        }

        const parsedJson = await new Response(archiveFile).json();
        const {
          character: importedCard,
          characterFileName,
          preset: importedPreset,
          session: rawImportedSession,
          userPersona: importedPersona,
        } = validateAdventureArchive(parsedJson, isRecordObject).data;

        const normalizedSession = sessionPersistence.normalizeLoadedSession({
          ...rawImportedSession,
          characterFileName,
          lastUpdated: Date.now(),
        }).record;

        await repositories.mergeRecords({
          characters: [await normalizeCharacterForSave({
            card: importedCard,
            fileName: characterFileName,
            avatarUrl: null,
            avatarFile: null,
          })],
          presets: importedPreset ? [importedPreset] : [],
          personas: importedPersona ? [importedPersona] : [],
          chatSessions: [normalizedSession],
        });
        diagnosticsState.drop(normalizedSession.sessionId);

        await Promise.all([reloadCharacters(), reloadPresets(), reloadPersonas(), reloadSavedSessions()]);
        showToast('Nhập bản ghi thành công!', 'success');
        onSessionSelect(normalizedSession.sessionId);
      } catch (error) {
        console.error('Import failed', error);
        setErrorMessage(`Lỗi nhập bản ghi: Lỗi khi nhập bản ghi: ${error instanceof Error ? error.message : String(error)}`);
      } finally {
        setIsImportingArchive(false);
      }
    };

    const handleConfirmExportSession = fileName => {
      if (!sessionToExport) return;
      const targetCharacter = characters.find(item => item.fileName === sessionToExport.characterFileName);
      const targetPersona = personas.find(item => item.id === sessionToExport.userPersonaId) || activePersona;
      let targetPreset = activePreset && activePreset.name === sessionToExport.presetName
        ? activePreset
        : presets.find(item => item.name === sessionToExport.presetName);
      targetPreset ||= activePreset;

      if (!targetCharacter || !targetPreset) {
        alert('Không thể xuất: Dữ liệu nhân vật hoặc preset gốc bị thiếu.');
        return;
      }

      const exportedPreset = {
        ...targetPreset,
        name: `Cài đặt · ${targetCharacter.card.name}`,
      };

      try {
        const archivePayload = {
          version: 1,
          timestamp: Date.now(),
          meta: {
            exportedBy: 'AI Studio Card Tool',
            description: `Bản ghi phiêu lưu: ${targetCharacter.card.name} - ${new Date().toLocaleString()}`,
          },
          data: {
            character: targetCharacter.card,
            characterFileName: sessionToExport.characterFileName,
            preset: exportedPreset,
            session: sessionToExport,
            userPersona: targetPersona,
          },
        };
        const blob = new Blob([JSON.stringify(archivePayload)], { type: 'application/json' });
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(objectUrl);
      } catch (error) {
        console.error(error);
        alert('Lỗi khi tạo bản ghi xuất.');
      }
    };

    const activeCharacterFileNames = new Set(sessions.map(session => session.characterFileName));
    const availableCharacters = characters.filter(character => !activeCharacterFileNames.has(character.fileName));
    const resumableSessions = sessions
      .map(session => ({
        session,
        character: characters.find(character => character.fileName === session.characterFileName),
      }))
      .filter(item => item.character);

    if (isLoadingSessions || isLoadingCharacters) {
      return jsxRuntime.jsx('div', {
        className: 'flex justify-center items-center h-full',
        children: jsxRuntime.jsx(LoadingIndicator, { message: 'Đang tải sảnh trò chuyện...' }),
      });
    }

    const exportDefaultFileName = sessionToExport
      ? `Adventure_${(characters.find(item => item.fileName === sessionToExport.characterFileName)?.card.name || 'Character').replace(/[^a-z0-9]/gi, '_')}_${sessionToExport.sessionId.substring(0, 8)}`
      : 'Adventure';

    return jsxRuntime.jsxs('div', {
      className: 'space-y-10',
      children: [
        errorMessage && jsxRuntime.jsx('p', {
          className: 'text-red-400 text-center bg-red-900/20 p-3 rounded',
          children: errorMessage,
        }),
        jsxRuntime.jsx('div', {
          className: '',
          children: jsxRuntime.jsx(AdventureImportDropzone, {
            onImport: handleImportAdventureArchive,
            isLoading: isImportingArchive,
          }),
        }),
        jsxRuntime.jsxs('div', {
          children: [
            jsxRuntime.jsx('h2', {
              className: 'text-2xl font-bold text-sky-400 mb-4 border-b-2 border-slate-700 pb-2',
              children: 'Tiếp tục nhân vật',
            }),
            resumableSessions.length > 0
              ? jsxRuntime.jsx('div', {
                  className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
                  children: resumableSessions.map(({ session, character }) => jsxRuntime.jsx(SessionListItem, {
                    session,
                    character,
                    onClick: () => onSessionSelect(session.sessionId),
                    onDelete: () => handleDeleteSession(session.sessionId),
                    onExport: () => {
                      setSessionToExport(session);
                      setIsExportDialogOpen(true);
                    },
                  }, session.sessionId)),
                })
              : jsxRuntime.jsx('p', {
                  className: 'text-slate-500 italic',
                  children: 'Không có cuộc trò chuyện nào đang diễn ra.',
                }),
          ],
        }),
        jsxRuntime.jsxs('div', {
          children: [
            jsxRuntime.jsx('h2', {
              className: 'text-2xl font-bold text-sky-400 mb-4 border-b-2 border-slate-700 pb-2',
              children: 'Bắt đầu cuộc phiêu lưu mới',
            }),
            availableCharacters.length > 0
              ? jsxRuntime.jsx('div', {
                  className: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4',
                  children: availableCharacters.map(character => jsxRuntime.jsx(CharacterLaunchCard, {
                    character,
                    onClick: () => setGreetingTargetCharacter(character),
                    onImportStory: event => {
                      event.stopPropagation();
                      if (activePreset) {
                        setStoryTargetCharacter(character);
                      } else {
                        showToast('Vui lòng chọn một Preset trước.', 'error');
                      }
                    },
                  }, character.fileName)),
                })
              : jsxRuntime.jsx('p', {
                  className: 'text-slate-500 italic',
                  children: 'Tất cả các nhân vật đã có cuộc trò chuyện. Tải lên nhân vật mới để bắt đầu cuộc phiêu lưu mới!',
                }),
          ],
        }),
        greetingTargetCharacter && activePreset && jsxRuntime.jsx(GreetingDialog, {
          character: greetingTargetCharacter,
          preset: activePreset,
          onClose: () => setGreetingTargetCharacter(null),
          onStart: greetingText => handleStartNewSession(greetingTargetCharacter, greetingText),
        }),
        storyTargetCharacter && activePreset && jsxRuntime.jsx(StorySetupDialog, {
          character: storyTargetCharacter,
          preset: activePreset,
          onClose: () => setStoryTargetCharacter(null),
          onStart: sessionId => {
            setStoryTargetCharacter(null);
            onSessionSelect(sessionId);
          },
        }),
        jsxRuntime.jsx(FileNameDialog, {
          isOpen: isExportDialogOpen,
          onClose: () => setIsExportDialogOpen(false),
          onConfirm: handleConfirmExportSession,
          initialFileName: exportDefaultFileName,
          title: 'Xuất Bản Ghi Phiêu Lưu',
          fileExtension: '.json',
        }),
      ],
    });
  };
}
