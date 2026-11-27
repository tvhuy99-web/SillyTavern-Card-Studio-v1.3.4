export function createActionSuggestionDialog(getDependencies) {
  return function ActionSuggestionDialog({
    isOpen,
    onClose,
    gameHistory,
    card,
    variables,
    logs,
    onUpdateVariable,
    onRewriteMessage,
  }) {
    const {
      markdownParser,
      ModelTestButton,
      ActionProposal,
      defaultCopilotSystemPrompt,
      defaultGeminiModels,
      htmlSanitizer,
      connections,
      proxyPersistence,
      react,
      presetStore,
      buildSavedProbeTarget,
      useToast,
      useGeminiCatalog,
      characterStore,
      Icon,
      LoadingIndicator,
      testModel,
      GoogleGenAIClient,
      jsxRuntime,
      getGeminiApiKey,
    } = getDependencies();

    const { updateActiveCharacter, reloadCharacters } = characterStore();
    const { presets, activePresetName, updateActivePreset, reloadPresets } = presetStore();
    const { showToast } = useToast();
    const { models: geminiModels } = useGeminiCatalog(defaultGeminiModels);

    const [chatMessages, setChatMessages] = react.useState([{
      role: 'model',
      content: 'Xin chào! Tôi là Co-pilot. Tôi đã đọc xong Sổ tay nhân vật, Biến số và Lời nhắc hệ thống. Bạn cần tôi giải thích điều gì?',
    }]);
    const [inputText, setInputText] = react.useState('');
    const [isSending, setIsSending] = react.useState(false);
    const [selectedModel, setSelectedModel] = react.useState('gemini-3-flash-preview');
    const [isPromptSettingsOpen, setIsPromptSettingsOpen] = react.useState(false);
    const [systemPromptTemplate, setSystemPromptTemplate] = react.useState(defaultCopilotSystemPrompt);
    const scrollBottomRef = react.useRef(null);

    react.useEffect(() => {
      if (!isPromptSettingsOpen) {
        scrollBottomRef.current?.scrollIntoView({ behavior: 'auto', block: 'nearest' });
      }
    }, [chatMessages, isOpen, isPromptSettingsOpen]);

    const buildCopilotPrompt = userQuery => {
      const charBookText = card?.char_book?.entries
        ? card.char_book.entries
            .filter(entry => entry.enabled !== false)
            .map(entry => `[Mục: ${entry.comment || 'Không tên'}]\nKeys: ${entry.keys.join(', ')}\nNội dung: ${entry.content}`)
            .join('\n\n')
        : '(Không có Sổ tay)';

      const activePreset = presets.find(preset => preset.name === activePresetName);
      const promptStructureText = activePreset && activePreset.prompts
        ? activePreset.prompts.map((prompt, index) => `${index}. ${prompt.enabled ? '[BẬT]' : '[TẮT]'} "${prompt.name}"`).join('\n')
        : '(Không có cấu trúc Preset)';

      const lastOutgoingPromptText = logs.turns && logs.turns.length !== 0
        ? logs.turns[0].prompt.map(section => `--- ${section.name} ---\n${section.content}`).join('\n\n')
        : '(Chưa có lượt nào được ghi lại)';

      const roleplayHistoryText = gameHistory.slice(-15).map(message => {
        const speaker = message.role === 'user' ? 'User' : (card?.name || 'Char');
        let cleanText = message.content.replace(/<[^>]*>/g, '');
        if (cleanText.length > 500) {
          cleanText = `${cleanText.substring(0, 500)}...`;
        }
        return `${speaker}: ${cleanText}`;
      }).join('\n');

      const copilotHistoryText = chatMessages
        .slice(-10)
        .map(message => `${message.role.toUpperCase()}: ${message.content}`)
        .join('\n');

      return systemPromptTemplate
        .replace('{{char_book}}', charBookText)
        .replace('{{prompt_structure}}', promptStructureText)
        .replace('{{variables}}', JSON.stringify(variables, null, 2))
        .replace('{{last_outgoing_prompt}}', lastOutgoingPromptText)
        .replace('{{roleplay_history}}', roleplayHistoryText)
        .replace('{{chat_history}}', copilotHistoryText)
        .replace('{{char}}', card?.name || 'Character')
        .replace('{{user}}', 'User')
        .replace('{{user_query}}', userQuery);
    };

    const handleSendQuery = async () => {
      if (!inputText.trim() || isSending) return;
      const queryText = inputText;
      setChatMessages(previous => [...previous, { role: 'user', content: queryText }]);
      setInputText('');
      setIsSending(true);
      try {
        const apiKey = getGeminiApiKey();
        if (!apiKey) {
          throw new Error('Chưa có API Key.');
        }
        let parsedProposal;
        const client = new GoogleGenAIClient({ apiKey });
        const prompt = buildCopilotPrompt(queryText);
        const responseText = (await client.models.generateContent({
          model: selectedModel,
          contents: prompt,
        })).text || 'Xin lỗi, tôi không thể phản hồi lúc này.';

        let displayReply = responseText;
        const jsonFenceMatch = responseText.match(/```json\s*(\{[\s\S]*?\})\s*```/);
        if (jsonFenceMatch) {
          try {
            parsedProposal = JSON.parse(jsonFenceMatch[1]);
            displayReply = responseText.replace(jsonFenceMatch[0], '').trim();
          } catch {
            console.warn('Failed to parse Action JSON from AI response');
          }
        }
        setChatMessages(previous => [...previous, {
          role: 'model',
          content: displayReply,
          actionProposal: parsedProposal,
        }]);
      } catch (error) {
        setChatMessages(previous => [...previous, {
          role: 'model',
          content: `Lỗi: ${error instanceof Error ? error.message : String(error)}`,
        }]);
      } finally {
        setIsSending(false);
      }
    };

    const handleExecuteProposal = async (proposal, targetScope) => {
      if (proposal.tool === 'update_variable') {
        try {
          onUpdateVariable(proposal.data.key, proposal.data.value);
          showToast(`Đã cập nhật biến ${proposal.data.key} thành công.`, 'success');
        } catch (error) {
          showToast(`Lỗi cập nhật biến: ${error}`, 'error');
        }
        return;
      }

      if (proposal.tool === 'rewrite_last_turn') {
        try {
          const latestModelMessage = [...gameHistory].reverse().find(message => message.role === 'model');
          if (!latestModelMessage) {
            showToast('Không tìm thấy tin nhắn nào của AI để viết lại.', 'warning');
            return;
          }
          const rewritten = await onRewriteMessage(latestModelMessage.id, proposal.data.content);
          if (rewritten === false) {
            showToast('Hệ thống đang bận; chưa viết lại phản hồi.', 'warning');
          } else {
            showToast('Đã viết lại phản hồi mới nhất.', 'success');
          }
        } catch (error) {
          showToast(`Lỗi viết lại: ${error}`, 'error');
        }
        return;
      }

      if (!card) {
        showToast('Không tìm thấy thẻ nhân vật đang hoạt động.', 'error');
        return;
      }

      try {
        if (targetScope === 'preset') {
          const activePreset = presets.find(preset => preset.name === activePresetName);
          if (!activePreset) {
            throw new Error('Không tìm thấy Preset đang hoạt động.');
          }
          const clonedPreset = JSON.parse(JSON.stringify(activePreset));
          clonedPreset.prompts ||= [];

          if (proposal.tool === 'add_prompt') {
            clonedPreset.prompts.push({ ...proposal.data, identifier: `auto_${Date.now()}` });
          } else if (proposal.tool === 'move_prompt') {
            const targetIndex = clonedPreset.prompts.findIndex(item => item.name === proposal.data.name);
            if (targetIndex !== -1) {
              const [moved] = clonedPreset.prompts.splice(targetIndex, 1);
              let insertIndex = 0;
              if (proposal.data.position === 'top') {
                insertIndex = 0;
              } else if (proposal.data.position === 'bottom') {
                insertIndex = clonedPreset.prompts.length;
              } else {
                insertIndex = Math.min(Math.max(0, Number.parseInt(proposal.data.position, 10)), clonedPreset.prompts.length);
              }
              clonedPreset.prompts.splice(insertIndex, 0, moved);
            }
          } else if (proposal.tool === 'toggle_prompt') {
            const targetIndex = clonedPreset.prompts.findIndex(item => item.name === proposal.data.name);
            if (targetIndex !== -1) {
              clonedPreset.prompts[targetIndex].enabled = proposal.data.enabled;
            }
          } else if (proposal.tool === 'edit_prompt') {
            const targetIndex = clonedPreset.prompts.findIndex(item => item.name === proposal.data.name);
            if (targetIndex !== -1) {
              clonedPreset.prompts[targetIndex].content = proposal.data.content;
            }
          } else if (proposal.tool === 'update_author_note') {
            clonedPreset.prompts.push({
              name: 'Author Note (AI Added)',
              content: proposal.data.content,
              role: 'system',
              enabled: true,
              identifier: `an_${Date.now()}`,
            });
          } else if (proposal.tool === 'add_lore') {
            clonedPreset.prompts.push({
              name: `Lore: ${proposal.data.keys?.[0] || 'New Info'}`,
              content: `${proposal.data.keys?.join(', ')}: ${proposal.data.content}`,
              role: 'system',
              enabled: true,
              identifier: `lore_${Date.now()}`,
            });
          }

          await updateActivePreset(clonedPreset);
          showToast('Đã cập nhật Preset thành công!', 'success');
          await reloadPresets();
        } else if (targetScope === 'character') {
          const clonedCard = JSON.parse(JSON.stringify(card));
          if (proposal.tool === 'add_prompt') {
            clonedCard.system_prompt = `${clonedCard.system_prompt || ''}\n\n[${proposal.data.name}]\n${proposal.data.content}`;
          } else if (proposal.tool === 'update_author_note') {
            clonedCard.system_prompt = `${clonedCard.system_prompt || ''}\n\n[Author Note]\n${proposal.data.content}`;
          } else if (proposal.tool === 'add_lore') {
            clonedCard.char_book ||= { entries: [] };
            if (!clonedCard.char_book.entries) {
              clonedCard.char_book.entries = [];
            }
            clonedCard.char_book.entries.push({
              keys: proposal.data.keys || ['keyword'],
              content: proposal.data.content || '',
              comment: `AI Generated - ${new Date().toLocaleTimeString()}`,
              enabled: true,
              constant: false,
              selective: true,
              uid: `ai_gen_${Date.now()}`,
            });
          } else if (proposal.tool === 'edit_prompt') {
            const matchingField = Object.keys(clonedCard).find(
              key => key.toLowerCase() === proposal.data.name.toLowerCase(),
            );
            if (matchingField && typeof clonedCard[matchingField] === 'string') {
              clonedCard[matchingField] = proposal.data.content;
              showToast(`Đã cập nhật trường '${matchingField}' của nhân vật.`, 'success');
            } else {
              clonedCard.system_prompt = `${clonedCard.system_prompt || ''}\n\n[Edit: ${proposal.data.name}]\n${proposal.data.content}`;
              showToast(`Đã thêm nội dung vào System Prompt nhân vật (Không tìm thấy trường '${proposal.data.name}').`, 'info');
            }
          } else {
            showToast('Hành động này (Move/Toggle) chỉ hỗ trợ tốt nhất trên Preset.', 'warning');
            return;
          }

          await updateActiveCharacter(clonedCard);
          showToast('Đã cập nhật Thẻ Nhân vật thành công!', 'success');
          await reloadCharacters();
        }
      } catch (error) {
        console.error(error);
        showToast(`Lỗi khi lưu: ${error instanceof Error ? error.message : String(error)}`, 'error');
      }
    };

    if (!isOpen) return null;

    const macroDocs = [
      ['{{char_book}}', 'Nội dung Sổ tay Thế giới (Lorebook) đang kích hoạt.'],
      ['{{prompt_structure}}', 'Danh sách và trạng thái (Bật/Tắt) của các Lời nhắc (Prompt) trong Preset.'],
      ['{{variables}}', 'Toàn bộ biến số hiện tại của trò chơi (stat_data).'],
      ['{{roleplay_history}}', 'Lịch sử hội thoại của câu chuyện chính (giữa User và Character).'],
      ['{{chat_history}}', 'Lịch sử trò chuyện giữa Bạn và Co-pilot này.'],
      ['{{last_outgoing_prompt}}', 'Toàn bộ lời nhắc hệ thống thực tế vừa gửi đi cho AI ở lượt trước.'],
      ['{{user_query}}', 'Câu hỏi hiện tại của bạn dành cho Co-pilot.'],
      ['{{char}} / {{user}}', 'Tên nhân vật và tên người dùng.'],
    ];

    const toolDocs = [
      ['update_variable', 'text-rose-400', 'Điều chỉnh giá trị biến số (ví dụ: HP, thiện cảm...).'],
      ['rewrite_last_turn', 'text-cyan-400', 'Viết lại nội dung phản hồi cuối cùng của nhân vật chính.'],
      ['add_prompt', 'text-green-400', 'Thêm một lời nhắc hệ thống mới vào Preset.'],
      ['move_prompt', 'text-blue-400', 'Thay đổi vị trí thứ tự của một lời nhắc.'],
      ['toggle_prompt', 'text-amber-400', 'Bật hoặc Tắt trạng thái hoạt động của một lời nhắc.'],
      ['edit_prompt', 'text-fuchsia-400', 'Chỉnh sửa nội dung của một lời nhắc có sẵn.'],
      ['add_lore', 'text-indigo-400', 'Thêm một mục World Info mới vào ngữ cảnh.'],
    ];

    return jsxRuntime.jsxs('div', {
      className: 'fixed inset-y-0 right-0 z-[60] w-[450px] max-w-full bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col    ease-in-out ',
      role: 'dialog',
      'aria-labelledby': 'copilot-title',
      children: [
        jsxRuntime.jsxs('div', {
          className: 'p-3 border-b border-slate-700 bg-slate-800/80 flex flex-col gap-3 shrink-0',
          children: [
            jsxRuntime.jsxs('div', {
              className: 'flex justify-between items-center',
              children: [
                jsxRuntime.jsxs('h3', {
                  id: 'copilot-title',
                  className: 'font-bold text-sky-400 flex items-center gap-2',
                  children: [
                    ' Trợ Lý Co-pilot (Architect)',
                  ],
                }),
                jsxRuntime.jsxs('div', {
                  className: 'flex items-center gap-1',
                  children: [
                    jsxRuntime.jsx('button', {
                      onClick: () => setIsPromptSettingsOpen(!isPromptSettingsOpen),
                      className: `p-1.5 rounded  ${
                        isPromptSettingsOpen ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
                      }`,
                      title: 'Cài đặt Prompt Co-pilot',
                      children: jsxRuntime.jsx(Icon, { name: 'settings', className: 'h-4 w-4' }),
                    }),
                    jsxRuntime.jsx('button', {
                      onClick: () => setChatMessages([{
                        role: 'model',
                        content: 'Đã làm mới cuộc trò chuyện. Tôi có thể giúp gì cho bạn?',
                      }]),
                      className: 'p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded ',
                      title: 'Cuộc trò chuyện mới',
                      children: jsxRuntime.jsx(Icon, { name: 'plus', className: 'h-4 w-4' }),
                    }),
                    jsxRuntime.jsx('button', {
                      onClick: onClose,
                      className: 'p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded ',
                      'aria-label': 'Đóng Co-pilot',
                      children: jsxRuntime.jsx(Icon, { name: 'close', className: 'h-4 w-4' }),
                    }),
                  ],
                }),
              ],
            }),
            jsxRuntime.jsxs('div', {
              children: [
                jsxRuntime.jsx('label', {
                  className: 'text-[10px] uppercase font-bold text-slate-500 mb-1 block',
                  children: 'Model Trợ Lý',
                }),
                jsxRuntime.jsxs('div', {
                  className: 'flex items-center gap-2',
                  children: [
                    jsxRuntime.jsx('select', {
                      'aria-label': 'Model Trợ Lý',
                      value: selectedModel,
                      onChange: event => setSelectedModel(event.target.value),
                      className: 'flex-1 min-w-0 bg-slate-950 border border-slate-700 rounded p-1.5 text-xs text-slate-300 focus:ring-1 focus:ring-sky-500 outline-none',
                      children: geminiModels.map(model => jsxRuntime.jsx('option', {
                        value: model.id,
                        children: model.name,
                      }, model.id)),
                    }),
                    ModelTestButton && buildSavedProbeTarget && testModel && jsxRuntime.jsx(ModelTestButton, {
                      target: buildSavedProbeTarget({
                        provider: 'gemini',
                        model: selectedModel,
                        connections,
                        proxyPersistence,
                      }),
                      testModel,
                      notify: showToast,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
        jsxRuntime.jsx('div', {
          className: 'flex-grow overflow-hidden relative flex flex-col',
          children: isPromptSettingsOpen
            ? jsxRuntime.jsxs('div', {
                className: 'absolute inset-0 bg-slate-900 z-10 flex flex-col p-4 ',
                children: [
                  jsxRuntime.jsxs('div', {
                    className: 'flex justify-between items-center mb-4',
                    children: [
                      jsxRuntime.jsx('h4', {
                        className: 'font-bold text-slate-200',
                        children: 'Cấu hình Prompt Co-pilot',
                      }),
                      jsxRuntime.jsx('button', {
                        onClick: () => setSystemPromptTemplate(defaultCopilotSystemPrompt),
                        className: 'text-xs text-sky-400 hover:underline',
                        children: 'Khôi phục mặc định',
                      }),
                    ],
                  }),
                  jsxRuntime.jsxs('div', {
                    className: 'flex-grow flex flex-col',
                    children: [
                      jsxRuntime.jsx('textarea', {
                        value: systemPromptTemplate,
                        'aria-label': 'Lời nhắc hệ thống Co-pilot',
                        onChange: event => setSystemPromptTemplate(event.target.value),
                        className: 'flex-grow w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-xs font-mono text-slate-300 focus:ring-1 focus:ring-indigo-500 resize-none',
                        placeholder: 'Nhập prompt hệ thống...',
                      }),
                      jsxRuntime.jsxs('div', {
                        className: 'mt-3 text-[10px] text-slate-400 bg-slate-950/50 p-3 rounded border border-slate-800 h-64 overflow-y-auto custom-scrollbar',
                        children: [
                          jsxRuntime.jsx('h5', {
                            className: 'font-bold text-slate-300 mb-2 border-b border-slate-700 pb-1',
                            children: '1. Các Biến số (Macros)',
                          }),
                          jsxRuntime.jsx('div', {
                            className: 'space-y-3 mb-4',
                            children: macroDocs.map(([macroName, desc]) => jsxRuntime.jsxs('div', {
                              children: [
                                jsxRuntime.jsx('code', {
                                  className: 'text-sky-400 font-mono font-bold',
                                  children: macroName,
                                }),
                                jsxRuntime.jsx('p', {
                                  className: 'pl-2 text-slate-500 mt-0.5',
                                  children: desc,
                                }),
                              ],
                            }, macroName)),
                          }),
                          jsxRuntime.jsx('h5', {
                            className: 'font-bold text-slate-300 mb-2 border-b border-slate-700 pb-1',
                            children: '2. Các Công cụ (Tools) AI có thể gọi',
                          }),
                          jsxRuntime.jsx('div', {
                            className: 'space-y-3',
                            children: toolDocs.map(([toolName, colorClass, desc]) => jsxRuntime.jsxs('div', {
                              children: [
                                jsxRuntime.jsx('code', {
                                  className: `${colorClass} font-mono font-bold`,
                                  children: toolName,
                                }),
                                jsxRuntime.jsx('p', {
                                  className: 'pl-2 text-slate-500 mt-0.5',
                                  children: desc,
                                }),
                              ],
                            }, toolName)),
                          }),
                        ],
                      }),
                    ],
                  }),
                  jsxRuntime.jsx('button', {
                    onClick: () => setIsPromptSettingsOpen(false),
                    className: 'mt-4 w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg ',
                    children: 'Lưu & Quay lại',
                  }),
                ],
              })
            : jsxRuntime.jsxs('div', {
                className: 'flex-grow overflow-y-auto custom-scrollbar p-3 space-y-3 bg-slate-900',
                children: [
                  chatMessages.map((message, index) => jsxRuntime.jsx('div', {
                    className: `flex flex-col ${message.role === 'user' ? 'items-end' : 'items-start'}`,
                    children: jsxRuntime.jsx('div', {
                      className: `max-w-[95%] rounded-lg p-3 text-sm ${
                        message.role === 'user'
                          ? 'bg-sky-700 text-white rounded-tr-none'
                          : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none'
                      }`,
                      children: message.role === 'model'
                        ? jsxRuntime.jsxs(jsxRuntime.Fragment, {
                            children: [
                              jsxRuntime.jsx('div', {
                                className: 'markdown-content',
                                dangerouslySetInnerHTML: {
                                  __html: htmlSanitizer.sanitize(markdownParser.parse(message.content)),
                                },
                              }),
                              message.actionProposal && jsxRuntime.jsx(ActionProposal, {
                                proposal: message.actionProposal,
                                onExecute: scope => handleExecuteProposal(message.actionProposal, scope),
                              }),
                            ],
                          })
                        : message.content,
                    }),
                  }, index)),
                  isSending && jsxRuntime.jsx('div', {
                    className: 'flex items-start',
                    children: jsxRuntime.jsxs('div', {
                      className: 'bg-slate-800 rounded-lg p-2 rounded-tl-none border border-slate-700 flex items-center gap-2 text-slate-400 text-xs',
                      children: [
                        jsxRuntime.jsx(LoadingIndicator, { message: '' }),
                        jsxRuntime.jsx('span', { children: 'Đang phân tích dữ liệu...' }),
                      ],
                    }),
                  }),
                  jsxRuntime.jsx('div', { ref: scrollBottomRef }),
                ],
              }),
        }),
        !isPromptSettingsOpen && jsxRuntime.jsx('div', {
          className: 'p-3 border-t border-slate-700 bg-slate-800 shrink-0',
          children: jsxRuntime.jsxs('div', {
            className: 'relative',
            children: [
              jsxRuntime.jsx('textarea', {
                value: inputText,
                'aria-label': 'Tin nhắn cho Co-pilot',
                onChange: event => setInputText(event.target.value),
                onKeyDown: event => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    handleSendQuery();
                  }
                },
                placeholder: 'Hỏi Co-pilot (Ví dụ: Tại sao chỉ số HP lại giảm?)...',
                rows: 2,
                disabled: isSending,
                className: 'w-full bg-slate-900 border border-slate-600 rounded-lg p-2 pr-10 text-sm text-slate-200 focus:outline-none focus:border-sky-500 resize-none',
              }),
              jsxRuntime.jsx('button', {
                onClick: handleSendQuery,
                disabled: !inputText.trim() || isSending,
                className: 'absolute bottom-2 right-2 p-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-md  disabled:bg-slate-700 disabled:text-slate-500',
                'aria-label': 'Gửi tin nhắn cho Co-pilot',
                children: jsxRuntime.jsx(Icon, { name: 'send', className: 'h-4 w-4' }),
              }),
            ],
          }),
        }),
      ],
    });
  };
}
