export function createCharacterDialogueSection(getDependencies) {
  return function CharacterDialogueSection({
    card: card,
    onUpdate: onUpdate,
    onChange: onChange
  }) {
    const {
      readProxyForTools,
      generateProxyText,
      generateAiStudioToolText,
      react,
      resolveCurrentModel,
      useToast,
      TextArea,
      CollapsibleSection,
      LoadingIndicator,
      readConnectionSettings,
      createGeminiClient,
      geminiSafetySettings,
      CopyButton,
      jsxRuntime
    } = getDependencies();
    let allGreetings = (0, react.useMemo)(() => [card.first_mes, ...(card.alternate_greetings || [])], [card.first_mes, card.alternate_greetings]);
    let fieldIdPrefix = (0, react.useId)();
    let [isGeneratingGreeting, setIsGeneratingGreeting] = (0, react.useState)(false);
    let {
      showToast: showToast
    } = useToast();
    let handleGreetingChange = (index, value) => {
      let nextGreetings = [...allGreetings];
      nextGreetings[index] = value;
      let [firstGreeting, ...alternateGreetings] = nextGreetings;
      onUpdate({
        ...card,
        first_mes: firstGreeting,
        alternate_greetings: alternateGreetings.length > 0 ? alternateGreetings : []
      });
    };
    let handleRemoveGreeting = index => {
      if (allGreetings.length <= 1) return;
      let [firstGreeting, ...alternateGreetings] = allGreetings.filter((greeting, greetingIndex) => greetingIndex !== index);
      onUpdate({
        ...card,
        first_mes: firstGreeting,
        alternate_greetings: alternateGreetings.length > 0 ? alternateGreetings : []
      });
    };
    let handlePromoteGreeting = index => {
      if (0 === index) return;
      let nextGreetings = [...allGreetings];
      let promotedGreeting = nextGreetings.splice(index, 1)[0];
      nextGreetings.unshift(promotedGreeting);
      let [firstGreeting, ...alternateGreetings] = nextGreetings;
      onUpdate({
        ...card,
        first_mes: firstGreeting,
        alternate_greetings: alternateGreetings
      });
    };
    let groupOnlyGreetings = card.group_only_greetings || [];
    let handleGroupGreetingChange = (index, value) => {
      let nextGreetings = [...groupOnlyGreetings];
      nextGreetings[index] = value;
      onUpdate({
        ...card,
        group_only_greetings: nextGreetings
      });
    };
    let handleRemoveGroupGreeting = index => onUpdate({
      ...card,
      group_only_greetings: groupOnlyGreetings.filter((greeting, greetingIndex) => greetingIndex !== index)
    });
    return (0, jsxRuntime.jsxs)(CollapsibleSection, {
      title: "Đối thoại",
      defaultOpen: false,
      description: "Lời chào đầu tiên và các ví dụ hội thoại.",
      children: [(0, jsxRuntime.jsx)("div", {
        className: "flex justify-end mb-4",
        children: (0, jsxRuntime.jsx)("button", {
          onClick: async () => {
            setIsGeneratingGreeting(true);
            try {
              let translatedGreetings = await async function (greetings, model = "gemini-3-flash-preview") {
                let prompt = `... (Prompt Logic) ... \n${JSON.stringify(greetings)}`;
                let responseText = "{}";
                try {
                  if (readConnectionSettings().source === "aistudio") {
                    let connectionSettings = readConnectionSettings();
                    responseText = await generateAiStudioToolText(prompt, connectionSettings.aistudio_tool_model || connectionSettings.aistudio_model || model);
                  } else if (readProxyForTools()) {
                    let connectionSettings = readConnectionSettings();
                    responseText = await generateProxyText(prompt, connectionSettings.proxy_tool_model || connectionSettings.proxy_model || model, connectionSettings.proxy_protocol);
                  } else responseText = (await createGeminiClient().models.generateContent({
                    model: model,
                    contents: prompt,
                    config: {
                      responseMimeType: "application/json",
                      safetySettings: geminiSafetySettings
                    }
                  })).text || "{}";
                  return JSON.parse(responseText);
                } catch (error) {
                  throw Error(error.message || "Lỗi dịch thuật từ AI.");
                }
              }({
                first_mes: card.first_mes,
                alternate_greetings: card.alternate_greetings || [],
                group_only_greetings: card.group_only_greetings || []
              }, {
                name: card.name,
                description: card.description
              }, resolveCurrentModel());
              onUpdate({
                ...card,
                first_mes: translatedGreetings.first_mes,
                alternate_greetings: translatedGreetings.alternate_greetings,
                group_only_greetings: translatedGreetings.group_only_greetings
              });
              showToast("Đã dịch xong toàn bộ lời chào!", "success");
            } catch (error) {
              console.error(error);
              showToast(`Lỗi dịch thuật: ${error instanceof Error ? error.message : String(error)}`, "error");
            } finally {
              setIsGeneratingGreeting(false);
            }
          },
          disabled: isGeneratingGreeting,
          className: "px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-lg shadow-md  flex items-center gap-2 disabled:bg-slate-600 disabled:cursor-not-allowed",
          children: isGeneratingGreeting ? (0, jsxRuntime.jsx)(LoadingIndicator, {
            message: "Đang dịch..."
          }) : (0, jsxRuntime.jsxs)(jsxRuntime.Fragment, {
            children: [(0, jsxRuntime.jsx)("span", {
              children: ""
            }), " Dịch toàn bộ Lời chào (AI)"]
          })
        })
      }), (0, jsxRuntime.jsxs)("div", {
        className: "space-y-4",
        children: [allGreetings.map((greeting, index) => (0, jsxRuntime.jsxs)("div", {
          className: "bg-slate-700/50 p-4 rounded-lg " + (isGeneratingGreeting ? "opacity-50 pointer-events-none" : ""),
          children: [(0, jsxRuntime.jsxs)("div", {
            className: "flex justify-between items-center mb-2",
            children: [(0, jsxRuntime.jsx)("label", {
              htmlFor: `${fieldIdPrefix}-${index}`,
              className: "text-sm font-bold text-slate-300",
              children: 0 === index ? "Lời chào Chính (first_mes)" : `Lời chào Thay thế #${index}`
            }), (0, jsxRuntime.jsxs)("div", {
              className: "flex items-center gap-2",
              children: [index > 0 && (0, jsxRuntime.jsx)("button", {
                onClick: () => handlePromoteGreeting(index),
                className: "text-xs bg-sky-700 hover:bg-sky-600 text-white font-semibold py-1 px-2 rounded-md ",
                children: "Đặt làm Chính"
              }), allGreetings.length > 1 && (0, jsxRuntime.jsx)("button", {
                onClick: () => handleRemoveGreeting(index),
                className: "text-slate-400 hover:text-red-400",
                "aria-label": `Xóa lời chào số ${index}`,
                children: (0, jsxRuntime.jsx)("svg", {
                  "aria-hidden": "true",
                  xmlns: "http://www.w3.org/2000/svg",
                  className: "h-5 w-5",
                  viewBox: "0 0 20 20",
                  fill: "currentColor",
                  children: (0, jsxRuntime.jsx)("path", {
                    fillRule: "evenodd",
                    d: "M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z",
                    clipRule: "evenodd"
                  })
                })
              })]
            })]
          }), (0, jsxRuntime.jsxs)("div", {
            className: "relative",
            children: [(0, jsxRuntime.jsx)("textarea", {
              id: `${fieldIdPrefix}-${index}`,
              value: greeting,
              onChange: event => handleGreetingChange(index, event.target.value),
              rows: 8,
              disabled: isGeneratingGreeting,
              className: "w-full bg-slate-700 border border-slate-600 rounded-md p-2 pr-10 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition disabled:bg-slate-800 disabled:text-slate-500"
            }), (0, jsxRuntime.jsx)(CopyButton, {
              textToCopy: greeting,
              absolute: true
            })]
          })]
        }, index)), (0, jsxRuntime.jsxs)("button", {
          onClick: () => {
            let [firstGreeting, ...alternateGreetings] = [...allGreetings, ""];
            onUpdate({
              ...card,
              first_mes: firstGreeting,
              alternate_greetings: alternateGreetings
            });
          },
          disabled: isGeneratingGreeting,
          className: "w-full bg-slate-700 hover:bg-slate-600 text-sky-400 font-semibold py-2 px-4 rounded-lg  border border-slate-600 disabled:opacity-50",
          children: [(0, jsxRuntime.jsx)("svg", {
            "aria-hidden": "true",
            xmlns: "http://www.w3.org/2000/svg",
            className: "h-5 w-5 inline mr-2",
            viewBox: "0 0 20 20",
            fill: "currentColor",
            children: (0, jsxRuntime.jsx)("path", {
              fillRule: "evenodd",
              d: "M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z",
              clipRule: "evenodd"
            })
          }), "Thêm Lời chào"]
        })]
      }), (0, jsxRuntime.jsx)("div", {
        className: "border-t border-slate-700 my-4"
      }), (0, jsxRuntime.jsxs)("div", {
        className: "space-y-4",
        children: [(0, jsxRuntime.jsx)("h4", {
          className: "text-lg font-semibold text-slate-300",
          children: "Lời chào Chỉ dành cho Nhóm"
        }), groupOnlyGreetings.map((greeting, index) => (0, jsxRuntime.jsxs)("div", {
          className: "bg-slate-700/50 p-4 rounded-lg",
          children: [(0, jsxRuntime.jsxs)("div", {
            className: "flex justify-between items-center mb-2",
            children: [(0, jsxRuntime.jsxs)("label", {
              className: "text-sm font-bold text-slate-300",
              children: ["Lời chào Nhóm #", index + 1]
            }), (0, jsxRuntime.jsx)("button", {
              onClick: () => handleRemoveGroupGreeting(index),
              className: "text-slate-400 hover:text-red-400",
              "aria-label": `Xóa lời chào nhóm số ${index + 1}`,
              children: (0, jsxRuntime.jsx)("svg", {
                "aria-hidden": "true",
                xmlns: "http://www.w3.org/2000/svg",
                className: "h-5 w-5",
                viewBox: "0 0 20 20",
                fill: "currentColor",
                children: (0, jsxRuntime.jsx)("path", {
                  fillRule: "evenodd",
                  d: "M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z",
                  clipRule: "evenodd"
                })
              })
            })]
          }), (0, jsxRuntime.jsxs)("div", {
            className: "relative",
            children: [(0, jsxRuntime.jsx)("textarea", {
              value: greeting,
              onChange: event => handleGroupGreetingChange(index, event.target.value),
              "aria-label": `Lời chào Nhóm ${index + 1}`,
              rows: 4,
              className: "w-full bg-slate-700 border border-slate-600 rounded-md p-2 pr-10 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
            }), (0, jsxRuntime.jsx)(CopyButton, {
              textToCopy: greeting,
              absolute: true
            })]
          })]
        }, index)), (0, jsxRuntime.jsxs)("button", {
          onClick: () => onUpdate({
            ...card,
            group_only_greetings: [...groupOnlyGreetings, ""]
          }),
          className: "w-full bg-slate-700 hover:bg-slate-600 text-sky-400 font-semibold py-2 px-4 rounded-lg  border border-slate-600",
          children: [(0, jsxRuntime.jsx)("svg", {
            "aria-hidden": "true",
            xmlns: "http://www.w3.org/2000/svg",
            className: "h-5 w-5 inline mr-2",
            viewBox: "0 0 20 20",
            fill: "currentColor",
            children: (0, jsxRuntime.jsx)("path", {
              fillRule: "evenodd",
              d: "M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z",
              clipRule: "evenodd"
            })
          }), "Thêm Lời chào Nhóm"]
        })]
      }), (0, jsxRuntime.jsx)("div", {
        className: "border-t border-slate-700 my-4"
      }), (0, jsxRuntime.jsx)(TextArea, {
        containerClassName: "col-span-full",
        label: "Ví dụ hội thoại (Phân tách bằng <START>)",
        value: card.mes_example,
        onChange: event => onChange("mes_example", event.target.value),
        rows: 8
      })]
    });
  };
}
