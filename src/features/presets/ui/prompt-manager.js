import { createAnchoredDialog, createChoiceSelect } from "../../../ui/components/dialog-focus.js";

const LONG_PRESS_DELAY_MS = 500;

export function createPromptListItem(getDependencies) {
  return function PromptListItem({
    prompt: propPrompt,
    index,
    onUpdate,
    onEdit,
    onOpenActions,
    actionsOpen = false,
    movingPromptIndex,
    onMoveTo
  }) {
    const {
      react,
      jsxRuntime,
      ToggleSwitch
    } = getDependencies();
    const useRef = react?.useRef;
    const pressTimerRef = useRef ? useRef(null) : { current: null };
    const longPressFiredRef = useRef ? useRef(false) : { current: false };

    const isMovingThis = movingPromptIndex === index;
    const isMoveActive = movingPromptIndex !== null && movingPromptIndex !== undefined;
    const displayName = propPrompt.name?.trim() || "Untitled Prompt";
    const promptContent = propPrompt.content || "";

    const clearPressTimer = () => {
      if (pressTimerRef.current !== null) {
        clearTimeout(pressTimerRef.current);
        pressTimerRef.current = null;
      }
    };

    const startLongPress = event => {
      const anchor = event.currentTarget;
      if (isMoveActive) return;
      clearPressTimer();
      longPressFiredRef.current = false;
      pressTimerRef.current = setTimeout(() => {
        pressTimerRef.current = null;
        longPressFiredRef.current = true;
        onOpenActions?.(index, anchor);
      }, LONG_PRESS_DELAY_MS);
    };

    react.useEffect?.(() => clearPressTimer, []);
    react.useEffect?.(() => {
      if (!actionsOpen) longPressFiredRef.current = false;
    }, [actionsOpen]);

    const handleTitleClick = event => {
      event.stopPropagation();
      if (longPressFiredRef.current) {
        longPressFiredRef.current = false;
        return;
      }
      if (isMoveActive) {
        onMoveTo?.(index);
        return;
      }
      onEdit?.(index);
    };

    const handleContextMenu = event => {
      if (isMoveActive) return;
      event.preventDefault();
      event.stopPropagation();
      clearPressTimer();
      if (longPressFiredRef.current) return;
      longPressFiredRef.current = true;
      onOpenActions?.(index, event.currentTarget);
    };

    return (0, jsxRuntime.jsx)("article", {
      className: `bg-slate-800 rounded-lg border border-slate-700 ${isMovingThis ? "ring-2 ring-sky-500 shadow-lg" : ""} ${isMoveActive && !isMovingThis ? "opacity-80 hover:border-sky-500/70" : ""}`,
      children: (0, jsxRuntime.jsxs)("div", {
        className: "flex items-start p-3",
        children: [
          (0, jsxRuntime.jsx)("div", {
            className: "flex items-center flex-shrink-0 mr-4 pt-1",
            onClick: event => event.stopPropagation(),
            children: (0, jsxRuntime.jsx)(ToggleSwitch, {
              label: "",
              ariaLabel: propPrompt.enabled ? "Đã chọn" : "Chưa chọn",
              checked: propPrompt.enabled ?? false,
              onChange: enabled => onUpdate(index, {
                ...propPrompt,
                enabled
              }),
              clean: true
            })
          }),
          (0, jsxRuntime.jsxs)("div", {
            className: "min-w-0 flex-grow",
            children: [
              (0, jsxRuntime.jsx)("h3", {
                className: "font-semibold text-base leading-6 " + (propPrompt.enabled ? "text-slate-100" : "text-slate-500 line-through"),
                children: (0, jsxRuntime.jsx)("button", {
                  type: "button",
                  onClick: handleTitleClick,
                  onContextMenu: handleContextMenu,
                  onPointerDown: startLongPress,
                  onPointerUp: clearPressTimer,
                  onPointerCancel: clearPressTimer,
                  onPointerLeave: clearPressTimer,
                  className: "w-full select-none rounded text-left hover:text-sky-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800",
                  children: displayName
                })
              }),
              promptContent.trim()
                ? (0, jsxRuntime.jsx)("p", {
                    className: "mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-400",
                    children: promptContent
                  })
                : (0, jsxRuntime.jsx)("p", {
                    className: "mt-2 text-sm italic text-slate-500",
                    children: "Lời nhắc này chưa có nội dung."
                  })
            ]
          })
        ]
      })
    });
  };
}

export function createPromptManager(getDependencies) {
  const ChoiceSelect = createChoiceSelect(getDependencies);
  const ActionMenu = createAnchoredDialog(getDependencies);
  return function PromptManager({
    preset,
    onUpdate
  }) {
    const {
      react,
      MacroReference,
      PromptEditDialog,
      PromptPreview,
      PromptListItem,
      useToast,
      jsxRuntime
    } = getDependencies();
    const toastApi = typeof useToast === "function" ? useToast() : null;
    const showToast = toastApi?.showToast || (() => {});

    const [filterMode, setFilterMode] = (0, react.useState)("all");
    const [movingPromptIndex, setMovingPromptIndex] = (0, react.useState)(null);
    const [editingPromptIndex, setEditingPromptIndex] = (0, react.useState)(null);
    const [actionPromptIndex, setActionPromptIndex] = (0, react.useState)(null);
    const actionAnchorRef = react.useRef(null);
    const openActions = (index, element) => {
      actionAnchorRef.current = element;
      setActionPromptIndex(index);
    };
    const lastFocusedRef = (0, react.useRef)(null);
    const prompts = preset.prompts || [];

    const handleUpdatePrompt = (0, react.useCallback)((index, updatedPrompt) => {
      const nextPrompts = [...prompts];
      nextPrompts[index] = updatedPrompt;
      onUpdate({
        ...preset,
        prompts: nextPrompts
      });
    }, [prompts, preset, onUpdate]);

    const handleRemovePrompt = (0, react.useCallback)(index => {
      const target = prompts[index];
      const name = target?.name?.trim() || "Untitled Prompt";
      if (typeof window !== "undefined" && typeof window.confirm === "function") {
        if (!window.confirm(`Bạn có chắc chắn muốn xóa lời nhắc "${name}" không?`)) return;
      }
      if (movingPromptIndex === index) setMovingPromptIndex(null);
      const remainingPrompts = prompts.filter((_, promptIndex) => promptIndex !== index);
      onUpdate({
        ...preset,
        prompts: remainingPrompts
      });
    }, [prompts, preset, onUpdate, movingPromptIndex]);

    const createBlankPrompt = () => ({
      identifier: `prompt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: "New Prompt",
      role: "system",
      content: "",
      enabled: true,
      include_title: false
    });

    const handleAddPrompt = (0, react.useCallback)(() => {
      onUpdate({
        ...preset,
        prompts: [...prompts, createBlankPrompt()]
      });
    }, [prompts, preset, onUpdate]);

    const handleInsertPromptBelow = (0, react.useCallback)(index => {
      const nextPrompts = [...prompts];
      nextPrompts.splice(index + 1, 0, createBlankPrompt());
      onUpdate({
        ...preset,
        prompts: nextPrompts
      });
      setEditingPromptIndex(index + 1);
    }, [prompts, preset, onUpdate]);

    const handleCopyPromptContent = (0, react.useCallback)(async index => {
      const content = prompts[index]?.content || "";
      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(content);
          showToast("Đã sao chép nội dung lời nhắc.", "success");
        }
      } catch {
        showToast("Không thể sao chép nội dung lời nhắc.", "error");
      }
    }, [prompts, showToast]);

    const handleOpenEdit = (0, react.useCallback)(index => {
      lastFocusedRef.current = document.activeElement;
      setEditingPromptIndex(index);
    }, []);

    const handleCloseEdit = (0, react.useCallback)(() => {
      setEditingPromptIndex(null);
      setTimeout(() => lastFocusedRef.current?.focus(), 0);
    }, []);

    const handleSaveEdit = (0, react.useCallback)(updatedPrompt => {
      if (editingPromptIndex !== null) handleUpdatePrompt(editingPromptIndex, updatedPrompt);
      handleCloseEdit();
    }, [editingPromptIndex, handleUpdatePrompt, handleCloseEdit]);

    const filteredPrompts = (0, react.useMemo)(() => prompts.map((prompt, index) => ({
      prompt,
      originalIndex: index
    })).filter(({ prompt }) => (
      filterMode === "enabled"
        ? prompt.enabled === true
        : filterMode !== "disabled" || !prompt.enabled
    )), [prompts, filterMode]);

    const handleMovePrompt = (0, react.useCallback)(targetIndex => {
      if (movingPromptIndex === null || movingPromptIndex === targetIndex) {
        setMovingPromptIndex(null);
        return;
      }
      const nextPrompts = [...prompts];
      const [movedPrompt] = nextPrompts.splice(movingPromptIndex, 1);
      const insertionIndex = targetIndex > movingPromptIndex ? targetIndex - 1 : targetIndex;
      nextPrompts.splice(insertionIndex, 0, movedPrompt);
      onUpdate({
        ...preset,
        prompts: nextPrompts
      });
      setMovingPromptIndex(null);
    }, [prompts, preset, onUpdate, movingPromptIndex]);

    const movingPrompt = movingPromptIndex !== null ? prompts[movingPromptIndex] : null;
    const actionPrompt = actionPromptIndex !== null ? prompts[actionPromptIndex] : null;

    return (0, jsxRuntime.jsxs)("div", {
      className: "space-y-5",
      children: [
        (0, jsxRuntime.jsx)(MacroReference, {}),
        (0, jsxRuntime.jsx)("div", {
          className: "flex items-center justify-between gap-3 p-2 bg-slate-800/50 rounded-lg",
          children: (0, jsxRuntime.jsx)(ChoiceSelect, {
            label: "Lọc lời nhắc",
            value: filterMode,
            onChange: event => setFilterMode(event.target.value),
            className: "bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500",
            options: [
              { value: "all", label: "Tất cả" },
              { value: "enabled", label: "Đã bật" },
              { value: "disabled", label: "Đã tắt" }
            ]
          })
        }),
        movingPrompt && (0, jsxRuntime.jsxs)("div", {
          role: "status",
          className: "flex items-center justify-between gap-3 p-3 bg-sky-950/60 border border-sky-500/60 rounded-lg",
          children: [
            (0, jsxRuntime.jsx)("p", {
              className: "text-sm text-sky-200",
              children: `Đang di chuyển "${movingPrompt.name?.trim() || "Untitled Prompt"}". Nhấn vào lời nhắc đích để đặt vào vị trí đó.`
            }),
            (0, jsxRuntime.jsx)("button", {
              type: "button",
              onClick: () => setMovingPromptIndex(null),
              className: "flex-shrink-0 px-3 py-1.5 text-sm font-semibold bg-red-600/80 hover:bg-red-500 text-white rounded-md",
              children: "Hủy di chuyển"
            })
          ]
        }),
        (0, jsxRuntime.jsxs)("div", {
          id: "prompt-list",
          className: "space-y-3",
          children: [
            filteredPrompts.map(({ prompt, originalIndex }) => (0, jsxRuntime.jsx)(PromptListItem, {
              prompt,
              index: originalIndex,
              onUpdate: handleUpdatePrompt,
              onEdit: handleOpenEdit,
              onOpenActions: openActions,
              actionsOpen: actionPromptIndex === originalIndex,
              movingPromptIndex,
              onMoveTo: handleMovePrompt
            }, prompt.identifier || originalIndex)),
            filteredPrompts.length === 0 && (0, jsxRuntime.jsx)("div", {
              className: "text-center py-8 text-slate-500",
              children: (0, jsxRuntime.jsx)("p", {
                children: "Không có lời nhắc nào khớp với bộ lọc này."
              })
            })
          ]
        }),
        prompts.length === 0 && (0, jsxRuntime.jsx)("button", {
          type: "button",
          onClick: handleAddPrompt,
          className: "w-full bg-slate-700 hover:bg-slate-600 text-sky-400 font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 border border-slate-600",
          children: "Thêm Lời nhắc Mới"
        }),
        actionPrompt && (0, jsxRuntime.jsx)(ActionMenu, {
          anchor: actionAnchorRef.current,
          label: `Tùy chọn cho ${actionPrompt.name?.trim() || "Untitled Prompt"}`,
          onClose: () => setActionPromptIndex(null),
          children: (0, jsxRuntime.jsxs)("div", {
            className: "py-1",
            children: [
              (0, jsxRuntime.jsx)("button", {
                type: "button",
                onClick: () => {
                  const idx = actionPromptIndex;
                  setActionPromptIndex(null);
                  setMovingPromptIndex(idx);
                },
                className: "w-full text-left px-4 py-3 text-sm text-slate-100 hover:bg-slate-800",
                children: "Chọn để di chuyển"
              }),
              (0, jsxRuntime.jsx)("button", {
                type: "button",
                onClick: () => {
                  const idx = actionPromptIndex;
                  setActionPromptIndex(null);
                  handleCopyPromptContent(idx);
                },
                className: "w-full text-left px-4 py-3 text-sm text-slate-100 hover:bg-slate-800",
                children: "Sao chép nội dung"
              }),
              (0, jsxRuntime.jsx)("button", {
                type: "button",
                onClick: () => {
                  const idx = actionPromptIndex;
                  setActionPromptIndex(null);
                  handleInsertPromptBelow(idx);
                },
                className: "w-full text-left px-4 py-3 text-sm text-slate-100 hover:bg-slate-800",
                children: "Thêm lời nhắc bên dưới"
              }),
              (0, jsxRuntime.jsx)("button", {
                type: "button",
                onClick: () => {
                  const idx = actionPromptIndex;
                  setActionPromptIndex(null);
                  handleRemovePrompt(idx);
                },
                className: "w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-950/60",
                children: "Xóa"
              })
            ]
          })
        }),
        (0, jsxRuntime.jsx)(PromptEditDialog, {
          isOpen: editingPromptIndex !== null,
          prompt: editingPromptIndex === null ? null : prompts[editingPromptIndex],
          onSave: handleSaveEdit,
          onClose: handleCloseEdit
        }),
        (0, jsxRuntime.jsx)(PromptPreview, {
          prompts
        })
      ]
    });
  };
}
