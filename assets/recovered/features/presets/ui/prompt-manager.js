// Factories receive the existing React/runtime bindings lazily via getDependencies().
// Mechanically extracted for F02.07 while preserving original component logic and contracts.

export function createPromptListItem(getDependencies) {
  return function PromptListItem({
    prompt: propPrompt,
    index: index,
    onUpdate: onUpdate,
    onRemove: onRemove,
    onEdit: onEdit,
    movingPromptIndex: movingPromptIndex,
    onSelectToMove: onSelectToMove,
    onMoveTo: onMoveTo,
    onCancelMove: onCancelMove
  }) {
    const {
      jsxRuntime,
      ToggleSwitch
    } = getDependencies();
    let isMovingThis = movingPromptIndex === index;
    let isMoveActive = null !== movingPromptIndex;
    let displayName = propPrompt.name?.trim() || "Untitled Prompt";
    let headingId = `prompt-heading-${propPrompt.identifier || index}`.replace(/[^a-zA-Z0-9_-]/g, "-");
    let promptContent = propPrompt.content || "";
    return (0, jsxRuntime.jsx)("article", {
      "aria-labelledby": headingId,
      className: `bg-slate-800 rounded-lg border border-slate-700 ${isMovingThis ? "ring-2 ring-sky-500 shadow-lg" : ""} ${isMoveActive && !isMovingThis ? "opacity-60" : ""}`,
      children: (0, jsxRuntime.jsxs)("div", {
        className: "flex items-start p-3",
        children: [(0, jsxRuntime.jsx)("div", {
          className: "flex items-center gap-2 flex-shrink-0 mr-4 pt-1",
          onClick: event => event.stopPropagation(),
          children: (0, jsxRuntime.jsx)(ToggleSwitch, {
            label: "",
            ariaLabel: undefined,
            checked: propPrompt.enabled ?? false,
            onChange: enabled => onUpdate(index, {
              ...propPrompt,
              enabled: enabled
            }),
            clean: true
          })
        }), (0, jsxRuntime.jsxs)("div", {
          className: "min-w-0 flex-grow",
          children: [(0, jsxRuntime.jsx)("h3", {
            id: headingId,
            className: "font-medium text-base leading-6 " + (propPrompt.enabled ? "text-slate-200" : "text-slate-500 line-through"),
            children: (0, jsxRuntime.jsx)("button", {
              type: "button",
              onClick: event => {
                event.stopPropagation();
                onEdit(index);
              },
              className: "rounded text-left hover:text-sky-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800",
              children: displayName
            })
          }), promptContent.trim() ? (0, jsxRuntime.jsx)("p", {
            className: "mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-400",
            children: promptContent
          }) : (0, jsxRuntime.jsx)("p", {
            className: "mt-2 text-sm italic text-slate-500",
            children: "Lời nhắc này chưa có nội dung."
          })]
        }), (0, jsxRuntime.jsxs)("div", {
          className: "flex items-center ml-4 flex-shrink-0 gap-1",
          children: [isMoveActive ? isMovingThis ? (0, jsxRuntime.jsx)("button", {
            type: "button",
            onClick: event => {
              event.stopPropagation();
              onCancelMove();
            },
            className: "p-2 bg-red-600/50 hover:bg-red-500/50 text-white rounded-md ",
            "aria-label": "Hủy di chuyển",
            children: (0, jsxRuntime.jsx)("svg", {
              "aria-hidden": "true",
              xmlns: "http://www.w3.org/2000/svg",
              className: "h-5 w-5",
              viewBox: "0 0 20 20",
              fill: "currentColor",
              children: (0, jsxRuntime.jsx)("path", {
                fillRule: "evenodd",
                d: "M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z",
                clipRule: "evenodd"
              })
            })
          }) : (0, jsxRuntime.jsx)("button", {
            type: "button",
            onClick: event => {
              event.stopPropagation();
              onMoveTo(index);
            },
            className: "px-3 py-1.5 text-sm bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-md ",
            "aria-label": "Di chuyển đến vị trí này",
            children: "Di chuyển đến đây"
          }) : (0, jsxRuntime.jsx)("button", {
            type: "button",
            onClick: event => {
              event.stopPropagation();
              onSelectToMove(index);
            },
            className: "p-2 text-slate-400 hover:text-sky-400 disabled:text-slate-600 disabled:cursor-not-allowed ",
            "aria-label": "Chọn để di chuyển",
            children: (0, jsxRuntime.jsx)("svg", {
              "aria-hidden": "true",
              xmlns: "http://www.w3.org/2000/svg",
              className: "h-5 w-5",
              fill: "none",
              viewBox: "0 0 24 24",
              stroke: "currentColor",
              strokeWidth: "2",
              children: (0, jsxRuntime.jsx)("path", {
                strokeLinecap: "round",
                strokeLinejoin: "round",
                d: "M4 6h16M4 12h16M4 18h16"
              })
            })
          }), (0, jsxRuntime.jsx)("button", {
            type: "button",
            onClick: event => {
              event.stopPropagation();
              onRemove(index);
            },
            className: "text-slate-500 hover:text-red-400 p-1",
            "aria-label": `Xóa lời nhắc ${displayName}`,
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
      })
    });
  };
}

export function createPromptManager(getDependencies) {
  return function PromptManager({
    preset: preset,
    onUpdate: onUpdate
  }) {
    const {
      EntrySelectionControl,
      react,
      MacroReference,
      PromptEditDialog,
      PromptPreview,
      PromptListItem,
      jsxRuntime
    } = getDependencies();
    let [filterMode, setFilterMode] = (0, react.useState)("all");
    let [movingPromptIndex, setMovingPromptIndex] = (0, react.useState)(null);
    let [editingPromptIndex, setEditingPromptIndex] = (0, react.useState)(null);
    let lastFocusedRef = (0, react.useRef)(null);
    let prompts = preset.prompts || [];
    let handleUpdatePrompt = (0, react.useCallback)((index, updatedPrompt) => {
      let nextPrompts = [...prompts];
      nextPrompts[index] = updatedPrompt;
      onUpdate({
        ...preset,
        prompts: nextPrompts
      });
    }, [prompts, preset, onUpdate]);
    let handleRemovePrompt = (0, react.useCallback)(index => {
      movingPromptIndex === index && setMovingPromptIndex(null);
      let remainingPrompts = prompts.filter((prompt, promptIndex) => promptIndex !== index);
      onUpdate({
        ...preset,
        prompts: remainingPrompts
      });
    }, [prompts, preset, onUpdate, movingPromptIndex]);
    let handleAddPrompt = (0, react.useCallback)(() => {
      let newPrompt = {
        identifier: `prompt_${Date.now()}`,
        name: "New Prompt",
        role: "system",
        content: "",
        enabled: true,
        include_title: false
      };
      onUpdate({
        ...preset,
        prompts: [...prompts, newPrompt]
      });
    }, [prompts, preset, onUpdate]);
    let handleOpenEdit = (0, react.useCallback)(index => {
      lastFocusedRef.current = document.activeElement;
      setEditingPromptIndex(index);
    }, []);
    let handleCloseEdit = (0, react.useCallback)(() => {
      setEditingPromptIndex(null);
      setTimeout(() => lastFocusedRef.current?.focus(), 0);
    }, []);
    let handleSaveEdit = (0, react.useCallback)(updatedPrompt => {
      null !== editingPromptIndex && handleUpdatePrompt(editingPromptIndex, updatedPrompt);
      handleCloseEdit();
    }, [editingPromptIndex, handleUpdatePrompt, handleCloseEdit]);
    let filteredPrompts = (0, react.useMemo)(() => prompts.map((prompt, index) => ({
      prompt: prompt,
      originalIndex: index
    })).filter(({
      prompt: prompt
    }) => "enabled" === filterMode ? true === prompt.enabled : "disabled" !== filterMode || !prompt.enabled), [prompts, filterMode]);
    let handleMovePrompt = (0, react.useCallback)(targetIndex => {
      if (null === movingPromptIndex || movingPromptIndex === targetIndex) return void setMovingPromptIndex(null);
      let nextPrompts = [...prompts];
      let [movedPrompt] = nextPrompts.splice(movingPromptIndex, 1);
      let insertionIndex = targetIndex > movingPromptIndex ? targetIndex - 1 : targetIndex;
      nextPrompts.splice(insertionIndex, 0, movedPrompt);
      onUpdate({
        ...preset,
        prompts: nextPrompts
      });
      setMovingPromptIndex(null);
    }, [prompts, preset, onUpdate, movingPromptIndex]);
    let handleToggleAllVisible = (0, react.useCallback)(() => {
      if (!preset || 0 === filteredPrompts.length) return void alert("Không có lời nhắc nào để xuất cho bộ lọc hiện tại.");
      let exportText = "all" === filterMode ? filteredPrompts.map(({
        prompt: prompt
      }) => `--- Lời nhắc: ${prompt.name || "Không có tiêu đề"} ---\n\n${prompt.content || ""}`).join("\n\n\n") : filteredPrompts.map(({
        prompt: prompt
      }) => prompt.content || "").join("\n\n----------------------------------------\n\n");
      let blob = new Blob([exportText], {
        type: "text/plain;charset=utf-8"
      });
      let downloadUrl = URL.createObjectURL(blob);
      let anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.download = `${preset.name.replace(/\.json$/i, "")}_prompts_${filterMode}.txt`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(downloadUrl);
    }, [preset, filteredPrompts, filterMode]);
    return (0, jsxRuntime.jsxs)("div", {
      className: "space-y-6",
      children: [(0, jsxRuntime.jsx)(MacroReference, {}), (0, jsxRuntime.jsxs)("div", {
        className: "flex flex-col sm:flex-row justify-between items-center gap-4 p-2 bg-slate-800/50 rounded-lg",
        children: [(0, jsxRuntime.jsxs)("div", {
          className: "p-1 bg-slate-900 rounded-lg flex space-x-1",
          children: [(0, jsxRuntime.jsx)(EntrySelectionControl, {
            filter: "all",
            currentFilter: filterMode,
            onClick: setFilterMode,
            label: "Tất cả"
          }), (0, jsxRuntime.jsx)(EntrySelectionControl, {
            filter: "enabled",
            currentFilter: filterMode,
            onClick: setFilterMode,
            label: "Đã bật"
          }), (0, jsxRuntime.jsx)(EntrySelectionControl, {
            filter: "disabled",
            currentFilter: filterMode,
            onClick: setFilterMode,
            label: "Đã tắt"
          })]
        }), (0, jsxRuntime.jsxs)("button", {
          onClick: handleToggleAllVisible,
          disabled: 0 === filteredPrompts.length,
          className: "flex items-center gap-2 px-4 py-1.5 text-sm font-semibold rounded-md   focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 text-sky-300 bg-sky-800/50 hover:bg-sky-700/60 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed",
          children: [(0, jsxRuntime.jsx)("svg", {
            "aria-hidden": "true",
            xmlns: "http://www.w3.org/2000/svg",
            className: "h-4 w-4",
            viewBox: "0 0 20 20",
            fill: "currentColor",
            children: (0, jsxRuntime.jsx)("path", {
              fillRule: "evenodd",
              d: "M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z",
              clipRule: "evenodd"
            })
          }), (0, jsxRuntime.jsx)("span", {
            children: "Xuất theo bộ lọc"
          })]
        })]
      }), (0, jsxRuntime.jsxs)("div", {
        id: "prompt-list",
        className: "space-y-3",
        children: [filteredPrompts.map(({
          prompt: prompt,
          originalIndex: index
        }) => (0, jsxRuntime.jsx)(PromptListItem, {
          prompt: prompt,
          index: index,
          onUpdate: handleUpdatePrompt,
          onRemove: handleRemovePrompt,
          movingPromptIndex: movingPromptIndex,
          onSelectToMove: setMovingPromptIndex,
          onMoveTo: handleMovePrompt,
          onCancelMove: () => setMovingPromptIndex(null),
          onEdit: handleOpenEdit
        }, prompt.identifier || index)), 0 === filteredPrompts.length && (0, jsxRuntime.jsx)("div", {
          className: "text-center py-8 text-slate-500",
          children: (0, jsxRuntime.jsx)("p", {
            children: "Không có lời nhắc nào khớp với bộ lọc này."
          })
        })]
      }), (0, jsxRuntime.jsxs)("button", {
        onClick: handleAddPrompt,
        className: "w-full bg-slate-700 hover:bg-slate-600 text-sky-400 font-semibold py-3 px-4 rounded-lg   flex items-center justify-center gap-2 border border-slate-600",
        children: [(0, jsxRuntime.jsx)("svg", {
          "aria-hidden": "true",
          xmlns: "http://www.w3.org/2000/svg",
          className: "h-5 w-5",
          viewBox: "0 0 20 20",
          fill: "currentColor",
          children: (0, jsxRuntime.jsx)("path", {
            fillRule: "evenodd",
            d: "M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z",
            clipRule: "evenodd"
          })
        }), (0, jsxRuntime.jsx)("span", {
          children: "Thêm Lời nhắc Mới"
        })]
      }), (0, jsxRuntime.jsx)(PromptEditDialog, {
        isOpen: null !== editingPromptIndex,
        prompt: null === editingPromptIndex ? null : prompts[editingPromptIndex],
        onSave: handleSaveEdit,
        onClose: handleCloseEdit
      }), (0, jsxRuntime.jsx)(PromptPreview, {
        prompts: prompts
      })]
    });
  };
}
