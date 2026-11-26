// Source recovery from the last verified production host.
// Factories receive the existing React/runtime bindings lazily to preserve initialization order.
// Public props and injected dependencies have descriptive aliases; internal locals retain recovered names.
function resolvePresetSectionDeps(getDependencies) {
  const deps = getDependencies();
  return {
    react: deps.react,
    jsxRuntime: deps.jsxRuntime,
    TextInput: deps.TextInput,
    TextArea: deps.TextArea,
    CollapsibleSection: deps.CollapsibleSection,
    SearchableSelect: deps.SearchableSelect,
    NumberInput: deps.NumberInput,
    StringListInput: deps.StringListInput,
    ToggleSwitch: deps.ToggleSwitch,
    CopyButton: deps.CopyButton,
    InlineCopyButton: deps.InlineCopyButton,
    useDialogFocus: deps.useDialogFocus,
    macroReference: deps.macroReference,
    PresetBasicSection: deps.PresetBasicSection,
    SamplingSection: deps.SamplingSection,
    GenerationControlSection: deps.GenerationControlSection,
    InstructSection: deps.InstructSection,
    ExperimentalSection: deps.ExperimentalSection,
    EntrySelectionControl: deps.EntrySelectionControl,
    MacroReference: deps.MacroReference,
    PromptEditDialog: deps.PromptEditDialog,
    PromptPreview: deps.PromptPreview,
    PromptListItem: deps.PromptListItem
  };
}
export function createPresetBasicSection(getDependencies) {
  return function PresetBasicSection({
    preset: preset,
    onChange: onChange
  }) {
    const {
      TextInput,
      TextArea,
      CollapsibleSection,
      jsxRuntime
    } = resolvePresetSectionDeps(getDependencies);
    return (0, jsxRuntime.jsxs)(CollapsibleSection, {
      title: "Thông tin cơ bản",
      description: "Tên, nhận xét và lời nhắc hệ thống chung.",
      children: [(0, jsxRuntime.jsx)(TextInput, {
        label: "Tên Preset",
        value: preset.name || "",
        onChange: e => onChange("name", e.target.value)
      }), (0, jsxRuntime.jsx)(TextInput, {
        label: "Nhận xét",
        value: preset.comment || "",
        onChange: e => onChange("comment", e.target.value)
      }), (0, jsxRuntime.jsx)(TextArea, {
        label: "Lời nhắc Hệ thống",
        value: preset.system_prompt || "",
        onChange: e => onChange("system_prompt", e.target.value),
        rows: 6,
        containerClassName: "md:col-span-2"
      })]
    });
  };
}
export function createSamplingSection(getDependencies) {
  return function SamplingSection({
    preset: preset,
    onChange: onChange
  }) {
    const {
      SearchableSelect,
      CollapsibleSection,
      NumberInput,
      jsxRuntime
    } = resolvePresetSectionDeps(getDependencies);
    return (0, jsxRuntime.jsxs)(jsxRuntime.Fragment, {
      children: [(0, jsxRuntime.jsxs)(CollapsibleSection, {
        title: "Sampling Cốt lõi",
        description: "Kiểm soát sự sáng tạo và tính mạch lạc.",
        children: [(0, jsxRuntime.jsx)(NumberInput, {
          label: "Nhiệt độ (Temperature)",
          value: preset.temp ?? 1,
          onChange: e => onChange("temp", e),
          min: 0,
          max: 2,
          step: .01,
          tooltip: "Độ ngẫu nhiên. Cao = Sáng tạo, Thấp = Chính xác."
        }), (0, jsxRuntime.jsx)(NumberInput, {
          label: "Top P",
          value: preset.top_p ?? .9,
          onChange: e => onChange("top_p", e),
          min: 0,
          max: 1,
          step: .01,
          tooltip: "Nucleus Sampling. Giới hạn tập hợp từ vựng."
        }), (0, jsxRuntime.jsx)(NumberInput, {
          label: "Top K",
          value: preset.top_k ?? 0,
          onChange: e => onChange("top_k", e),
          min: 0,
          max: 100,
          step: 1,
          tooltip: "0 = Tự động (không gửi topK). Giá trị từ 1 trở lên mới được gửi cho nhà cung cấp mô hình."
        }), (0, jsxRuntime.jsx)(NumberInput, {
          label: "Typical P",
          value: preset.typical_p ?? 1,
          onChange: e => onChange("typical_p", e),
          min: 0,
          max: 1,
          step: .01,
          tooltip: "Loại bỏ token không điển hình."
        })]
      }), (0, jsxRuntime.jsxs)(CollapsibleSection, {
        title: "Sampling Nâng cao",
        defaultOpen: false,
        description: "Các tham số tinh chỉnh sâu.",
        children: [(0, jsxRuntime.jsx)(NumberInput, {
          label: "Min P",
          value: preset.min_p ?? 0,
          onChange: e => onChange("min_p", e),
          min: 0,
          max: 1,
          step: .01,
          tooltip: "Ngưỡng xác suất tối thiểu."
        }), (0, jsxRuntime.jsx)(NumberInput, {
          label: "Repetition Penalty",
          value: preset.repetition_penalty ?? 1.1,
          onChange: e => onChange("repetition_penalty", e),
          min: 1,
          max: 2,
          step: .01,
          tooltip: "Phạt lặp lại từ."
        }), (0, jsxRuntime.jsx)(NumberInput, {
          label: "Frequency Penalty",
          value: preset.frequency_penalty ?? 0,
          onChange: e => onChange("frequency_penalty", e),
          min: 0,
          max: 2,
          step: .01
        }), (0, jsxRuntime.jsx)(NumberInput, {
          label: "Presence Penalty",
          value: preset.presence_penalty ?? 0,
          onChange: e => onChange("presence_penalty", e),
          min: 0,
          max: 2,
          step: .01
        })]
      }), (0, jsxRuntime.jsxs)(CollapsibleSection, {
        title: "Mirostat",
        defaultOpen: false,
        description: "Thuật toán kiểm soát sự ngạc nhiên (Perplexity).",
        children: [(0, jsxRuntime.jsx)(SearchableSelect, {
          label: "Chế độ Mirostat",
          value: preset.mirostat_mode ?? 0,
          onChange: e => onChange("mirostat_mode", parseInt(e.target.value, 10)),
          options: [{
            value: 0,
            label: "Tắt"
          }, {
            value: 1,
            label: "V1"
          }, {
            value: 2,
            label: "V2"
          }]
        }), (0, jsxRuntime.jsx)(NumberInput, {
          label: "Mirostat Tau",
          value: preset.mirostat_tau ?? 5,
          onChange: e => onChange("mirostat_tau", e),
          min: 0,
          max: 10,
          step: .1
        }), (0, jsxRuntime.jsx)(NumberInput, {
          label: "Mirostat ETA",
          value: preset.mirostat_eta ?? .1,
          onChange: e => onChange("mirostat_eta", e),
          min: 0,
          max: 1,
          step: .01
        })]
      })]
    });
  };
}
export function createGenerationControlSection(getDependencies) {
  return function GenerationControlSection({
    preset: preset,
    onChange: onChange
  }) {
    const {
      StringListInput,
      TextInput,
      CollapsibleSection,
      jsxRuntime,
      ToggleSwitch
    } = resolvePresetSectionDeps(getDependencies);
    return (0, jsxRuntime.jsxs)(jsxRuntime.Fragment, {
      children: [(0, jsxRuntime.jsxs)(CollapsibleSection, {
        title: "Kiểm soát Tạo văn bản",
        defaultOpen: false,
        description: "Độ dài, token và điều kiện dừng.",
        children: [(0, jsxRuntime.jsx)(TextInput, {
          label: "Max Tokens",
          value: preset.max_tokens ?? 2048,
          onChange: e => onChange("max_tokens", e.target.value),
          type: "text"
        }), (0, jsxRuntime.jsx)(TextInput, {
          label: "Độ dài cắt bỏ (Context Limit)",
          value: preset.truncation_length ?? 4096,
          onChange: e => onChange("truncation_length", e.target.value),
          type: "text"
        }), (0, jsxRuntime.jsxs)("div", {
          className: "space-y-4",
          children: [(0, jsxRuntime.jsx)(ToggleSwitch, {
            label: "Ban EOS Token",
            checked: preset.ban_eos_token ?? false,
            onChange: e => onChange("ban_eos_token", e)
          }), (0, jsxRuntime.jsx)(ToggleSwitch, {
            label: "Stream Response",
            checked: preset.stream_response ?? false,
            onChange: e => onChange("stream_response", e),
            tooltip: "Hiển thị văn bản ngay khi AI đang viết."
          })]
        })]
      }), (0, jsxRuntime.jsxs)(CollapsibleSection, {
        title: "Dừng Chuỗi (Stopping Strings)",
        defaultOpen: false,
        description: "Các chuỗi khiến AI ngừng tạo văn bản.",
        children: [(0, jsxRuntime.jsx)(StringListInput, {
          label: "Stopping Strings",
          values: preset.stopping_strings ?? [],
          onChange: e => onChange("stopping_strings", e)
        }), (0, jsxRuntime.jsx)(StringListInput, {
          label: "Custom Stopping Strings",
          values: preset.custom_stopping_strings ?? [],
          onChange: e => onChange("custom_stopping_strings", e)
        })]
      })]
    });
  };
}
export function createInstructSection(getDependencies) {
  return function InstructSection({
    preset: preset,
    onChange: onChange
  }) {
    const {
      TextInput,
      TextArea,
      CollapsibleSection,
      jsxRuntime
    } = resolvePresetSectionDeps(getDependencies);
    return (0, jsxRuntime.jsxs)(CollapsibleSection, {
      title: "Chế độ Instruct & Định dạng",
      defaultOpen: false,
      description: "Cấu hình khuôn mẫu cho lời nhắc.",
      children: [(0, jsxRuntime.jsx)(TextInput, {
        label: "WI Format",
        value: preset.wi_format || "",
        onChange: e => onChange("wi_format", e.target.value),
        tooltip: "Mẫu chèn World Info: {{keys}} {{content}}"
      }), (0, jsxRuntime.jsx)(TextInput, {
        label: "Scenario Format",
        value: preset.scenario_format || "",
        onChange: e => onChange("scenario_format", e.target.value)
      }), (0, jsxRuntime.jsx)(TextInput, {
        label: "Personality Format",
        value: preset.personality_format || "",
        onChange: e => onChange("personality_format", e.target.value)
      }), (0, jsxRuntime.jsx)(TextArea, {
        label: "Mẫu Instruct",
        value: preset.instruct_template || "",
        onChange: e => onChange("instruct_template", e.target.value),
        rows: 8,
        containerClassName: "md:col-span-2"
      }), (0, jsxRuntime.jsx)(TextArea, {
        label: "New Chat Prompt",
        value: preset.new_chat_prompt || "",
        onChange: e => onChange("new_chat_prompt", e.target.value),
        rows: 4,
        containerClassName: "md:col-span-2"
      })]
    });
  };
}
export function createExperimentalSection(getDependencies) {
  return function ExperimentalSection({
    preset: preset,
    onChange: onChange
  }) {
    const {
      react,
      TextArea,
      CollapsibleSection,
      NumberInput,
      jsxRuntime,
      ToggleSwitch
    } = resolvePresetSectionDeps(getDependencies);
    let [extensionsJson, setExtensionsJson] = (0, react.useState)(JSON.stringify(preset.extensions, null, 2) || "{}");
    let [isValidJson, setIsValidJson] = (0, react.useState)(true);
    (0, react.useEffect)(() => {
      setExtensionsJson(JSON.stringify(preset.extensions, null, 2) || "{}");
      setIsValidJson(true);
    }, [preset.extensions]);
    return (0, jsxRuntime.jsxs)(jsxRuntime.Fragment, {
      children: [(0, jsxRuntime.jsxs)(CollapsibleSection, {
        title: "Thử nghiệm & Khác",
        defaultOpen: false,
        description: "Thinking Budget và các tùy chọn khác.",
        children: [(0, jsxRuntime.jsx)(NumberInput, {
          label: "Thinking Budget",
          value: preset.thinking_budget ?? 0,
          onChange: e => onChange("thinking_budget", e),
          min: 0,
          max: 32768,
          step: 1024,
          tooltip: "Token dành cho suy nghĩ (Gemini 2.5+)."
        }), (0, jsxRuntime.jsxs)("div", {
          className: "md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4",
          children: [(0, jsxRuntime.jsx)(ToggleSwitch, {
            label: "Wrap in Quotes",
            checked: preset.wrap_in_quotes ?? false,
            onChange: e => onChange("wrap_in_quotes", e)
          }), (0, jsxRuntime.jsx)(ToggleSwitch, {
            label: "Max Context Unlocked",
            checked: preset.max_context_unlocked ?? false,
            onChange: e => onChange("max_context_unlocked", e)
          }), (0, jsxRuntime.jsx)(ToggleSwitch, {
            label: "Squash System Messages",
            checked: preset.squash_system_messages ?? true,
            onChange: e => onChange("squash_system_messages", e)
          }), (0, jsxRuntime.jsx)(ToggleSwitch, {
            label: "Bypass Status Check",
            checked: preset.bypass_status_check ?? true,
            onChange: e => onChange("bypass_status_check", e)
          })]
        })]
      }), (0, jsxRuntime.jsxs)(CollapsibleSection, {
        title: "Phần mở rộng (JSON)",
        defaultOpen: false,
        description: "Dữ liệu cấu hình thô.",
        children: [(0, jsxRuntime.jsx)(TextArea, {
          label: "Extensions JSON",
          value: extensionsJson,
          onChange: e => {
            let n = e.target.value;
            if (setExtensionsJson(n), !n.trim()) return onChange("extensions", {}), void setIsValidJson(true);
            try {
              onChange("extensions", JSON.parse(n));
              setIsValidJson(true);
            } catch {
              setIsValidJson(false);
            }
          },
          rows: 10,
          containerClassName: "md:col-span-2",
          className: isValidJson ? "" : "border-red-500"
        }), !isValidJson && (0, jsxRuntime.jsx)("p", {
          className: "text-xs text-red-400 mt-1",
          children: "JSON không hợp lệ (Dữ liệu cũ sẽ được giữ nguyên cho đến khi bạn sửa lại)."
        })]
      })]
    });
  };
}
export function createPresetConfiguration(getDependencies) {
  return function PresetConfiguration({
    preset: preset,
    onUpdate: onUpdate
  }) {
    const {
      react,
      GenerationControlSection,
      InstructSection,
      SamplingSection,
      ExperimentalSection,
      PresetBasicSection,
      jsxRuntime
    } = resolvePresetSectionDeps(getDependencies);
    let handleFieldChange = (0, react.useCallback)((n, r) => {
      onUpdate({
        ...preset,
        [n]: r
      });
    }, [preset, onUpdate]);
    return (0, jsxRuntime.jsxs)("div", {
      children: [(0, jsxRuntime.jsx)(PresetBasicSection, {
        preset: preset,
        onChange: handleFieldChange
      }), (0, jsxRuntime.jsx)(SamplingSection, {
        preset: preset,
        onChange: handleFieldChange
      }), (0, jsxRuntime.jsx)(GenerationControlSection, {
        preset: preset,
        onChange: handleFieldChange
      }), (0, jsxRuntime.jsx)(InstructSection, {
        preset: preset,
        onChange: handleFieldChange
      }), (0, jsxRuntime.jsx)(ExperimentalSection, {
        preset: preset,
        onChange: handleFieldChange
      })]
    });
  };
}
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
    } = resolvePresetSectionDeps(getDependencies);
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
          onClick: e => e.stopPropagation(),
          children: (0, jsxRuntime.jsx)(ToggleSwitch, {
            label: "",
            ariaLabel: undefined,
            checked: propPrompt.enabled ?? false,
            onChange: r => onUpdate(index, {
              ...propPrompt,
              enabled: r
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
              onClick: e => {
                e.stopPropagation();
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
            onClick: e => {
              e.stopPropagation();
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
            onClick: e => {
              e.stopPropagation();
              onMoveTo(index);
            },
            className: "px-3 py-1.5 text-sm bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-md ",
            "aria-label": "Di chuyển đến vị trí này",
            children: "Di chuyển đến đây"
          }) : (0, jsxRuntime.jsx)("button", {
            type: "button",
            onClick: e => {
              e.stopPropagation();
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
            onClick: e => {
              e.stopPropagation();
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
export function createPromptPreview(getDependencies) {
  return function PromptPreview({
    prompts: prompts
  }) {
    const {
      react,
      CopyButton,
      jsxRuntime
    } = resolvePresetSectionDeps(getDependencies);
    let [isExpanded, setIsExpanded] = (0, react.useState)(false);
    let previewText = (0, react.useMemo)(() => prompts.filter(e => e.enabled).map(e => e.include_title ? `--- ${e.name} ---\n${e.content}` : e.content).join("\n\n"), [prompts]);
    return (0, jsxRuntime.jsxs)("details", {
      className: "bg-slate-800/50 rounded-xl shadow-lg open:mb-6  ",
      open: isExpanded,
      onToggle: e => setIsExpanded(e.target.open),
      children: [(0, jsxRuntime.jsxs)("summary", {
        className: "p-4 cursor-pointer text-md font-bold text-sky-400 list-none flex justify-between items-center",
        children: [(0, jsxRuntime.jsx)("span", {
          children: "Xem trước Lời nhắc Gửi đi Cuối cùng"
        }), (0, jsxRuntime.jsx)("svg", {
          "aria-hidden": "true",
          className: "w-5 h-5 text-slate-400    " + (isExpanded ? "rotate-180" : ""),
          xmlns: "http://www.w3.org/2000/svg",
          fill: "none",
          viewBox: "0 0 24 24",
          stroke: "currentColor",
          children: (0, jsxRuntime.jsx)("path", {
            strokeLinecap: "round",
            strokeLinejoin: "round",
            strokeWidth: "2",
            d: "M19 9l-7 7-7-7"
          })
        })]
      }), (0, jsxRuntime.jsx)("div", {
        className: "p-4 pt-0",
        children: (0, jsxRuntime.jsxs)("div", {
          className: "relative",
          children: [(0, jsxRuntime.jsx)("textarea", {
            "aria-label": "Bản xem trước lời nhắc",
            readOnly: true,
            value: previewText,
            rows: 15,
            className: "w-full bg-slate-900/50 border border-slate-700 rounded-md p-3 text-slate-300 font-mono text-xs focus:outline-none"
          }), (0, jsxRuntime.jsx)("div", {
            className: "absolute top-2 right-2",
            children: (0, jsxRuntime.jsx)(CopyButton, {
              textToCopy: previewText,
              absolute: false
            })
          })]
        })
      })]
    });
  };
}
export function createPromptEditDialog(getDependencies) {
  return function PromptEditDialog({
    isOpen: isOpen,
    prompt: prompt,
    onSave: onSave,
    onClose: onClose
  }) {
    const {
      useDialogFocus,
      react,
      TextInput,
      TextArea,
      jsxRuntime,
      ToggleSwitch
    } = resolvePresetSectionDeps(getDependencies);
    let [draftPrompt, setDraftPrompt] = (0, react.useState)(null);
    let dialogRef = (0, react.useRef)(null);
    let closeButtonRef = (0, react.useRef)(null);
    if ((0, react.useEffect)(() => {
      setDraftPrompt(prompt ? JSON.parse(JSON.stringify(prompt)) : null);
    }, [prompt, isOpen]), useDialogFocus(isOpen, onClose, dialogRef, closeButtonRef), !isOpen || !draftPrompt) return null;
    let updateDraftField = (e, t) => {
      setDraftPrompt(n => n ? {
        ...n,
        [e]: t
      } : null);
    };
    return (0, jsxRuntime.jsx)("div", {
      className: "fixed inset-0 bg-black/60  flex items-center justify-center z-50 p-4   " + (isOpen ? "opacity-100" : "opacity-0 pointer-events-none"),
      onClick: onClose,
      "aria-hidden": !isOpen,
      children: (0, jsxRuntime.jsxs)("div", {
        ref: dialogRef,
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": "prompt-modal-title",
        className: "bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col   " + (isOpen ? "scale-100" : "scale-95"),
        onClick: e => e.stopPropagation(),
        children: [(0, jsxRuntime.jsxs)("header", {
          className: "p-4 border-b border-slate-700 flex justify-between items-center flex-shrink-0",
          children: [(0, jsxRuntime.jsx)("h2", {
            id: "prompt-modal-title",
            className: "text-xl font-bold text-sky-400",
            children: "Chỉnh sửa Lời nhắc"
          }), (0, jsxRuntime.jsx)("button", {
            ref: closeButtonRef,
            "aria-label": "Đóng",
            onClick: onClose,
            className: "p-1 text-slate-400 hover:text-white",
            children: (0, jsxRuntime.jsx)("svg", {
              "aria-hidden": "true",
              xmlns: "http://www.w3.org/2000/svg",
              className: "h-6 w-6",
              fill: "none",
              viewBox: "0 0 24 24",
              stroke: "currentColor",
              children: (0, jsxRuntime.jsx)("path", {
                strokeLinecap: "round",
                strokeLinejoin: "round",
                strokeWidth: "2",
                d: "M6 18L18 6M6 6l12 12"
              })
            })
          })]
        }), (0, jsxRuntime.jsxs)("div", {
          className: "p-6 space-y-4 overflow-y-auto",
          children: [(0, jsxRuntime.jsx)(TextInput, {
            label: "Tên Lời nhắc",
            value: draftPrompt.name,
            onChange: e => updateDraftField("name", e.target.value)
          }), (0, jsxRuntime.jsx)(TextArea, {
            label: "Nội dung",
            value: draftPrompt.content,
            onChange: e => updateDraftField("content", e.target.value),
            rows: 12
          }), (0, jsxRuntime.jsx)(ToggleSwitch, {
            label: "Gửi kèm Tiêu đề",
            checked: draftPrompt.include_title ?? false,
            onChange: e => updateDraftField("include_title", e)
          })]
        }), (0, jsxRuntime.jsxs)("footer", {
          className: "p-4 border-t border-slate-700 flex justify-end gap-3 flex-shrink-0",
          children: [(0, jsxRuntime.jsx)("button", {
            onClick: onClose,
            className: "px-4 py-2 text-sm font-medium rounded-md   text-slate-300 bg-slate-700 hover:bg-slate-600",
            children: "Hủy"
          }), (0, jsxRuntime.jsx)("button", {
            onClick: () => onSave(draftPrompt),
            className: "px-4 py-2 text-sm font-medium rounded-md   bg-sky-600 text-white hover:bg-sky-700",
            children: "Lưu Thay đổi"
          })]
        })]
      })
    });
  };
}
export function createPresetNameDialog(getDependencies) {
  return function PresetNameDialog({
    isOpen: isOpen,
    mode: mode,
    originalName: originalName,
    onClose: onClose,
    onConfirm: onConfirm
  }) {
    const {
      useDialogFocus,
      react,
      jsxRuntime
    } = resolvePresetSectionDeps(getDependencies);
    let [presetName, setPresetName] = (0, react.useState)("");
    let dialogRef = (0, react.useRef)(null);
    let inputRef = (0, react.useRef)(null);
    useDialogFocus(isOpen, onClose, inputRef, dialogRef);
    (0, react.useEffect)(() => {
      isOpen && mode && (setPresetName("clone" === mode ? `${originalName} (Copy)` : "rename" === mode ? originalName : "New Preset"), setTimeout(() => {
        dialogRef.current && (dialogRef.current.focus(), dialogRef.current.select());
      }, 50));
    }, [isOpen, mode, originalName]);
    let handleConfirm = () => {
      presetName.trim() && onConfirm(presetName.trim());
    };
    return isOpen && mode ? (0, jsxRuntime.jsx)("div", {
      className: "fixed inset-0 bg-black/70  flex items-center justify-center z-[200] p-4",
      onClick: onClose,
      role: "dialog",
      "aria-modal": "true",
      "aria-labelledby": "preset-name-dialog-title",
      children: (0, jsxRuntime.jsxs)("div", {
        ref: inputRef,
        className: "bg-slate-800 border border-slate-600 rounded-xl shadow-2xl w-full max-w-sm ",
        onClick: e => e.stopPropagation(),
        children: [(0, jsxRuntime.jsxs)("div", {
          className: "p-4 border-b border-slate-700 bg-slate-900/50 flex justify-between items-center",
          children: [(0, jsxRuntime.jsx)("h3", {
            id: "preset-name-dialog-title",
            className: "text-lg font-bold text-white",
            children: "create" === mode ? "Tạo Preset Mới" : "rename" === mode ? "Đổi tên Preset" : "Nhân bản Preset"
          }), (0, jsxRuntime.jsx)("button", {
            onClick: onClose,
            className: "text-slate-400 hover:text-white",
            "aria-label": "Đóng",
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
          })]
        }), (0, jsxRuntime.jsxs)("div", {
          className: "p-6",
          children: [(0, jsxRuntime.jsx)("label", {
            htmlFor: "preset-name-input",
            className: "block text-sm font-medium text-slate-300 mb-2",
            children: "Tên Preset"
          }), (0, jsxRuntime.jsx)("input", {
            id: "preset-name-input",
            ref: dialogRef,
            type: "text",
            value: presetName,
            onChange: e => setPresetName(e.target.value),
            onKeyDown: e => {
              if ("Enter" === e.key) {
                handleConfirm();
              } else {
                "Escape" === e.key && onClose();
              }
            },
            className: "w-full bg-slate-700 border border-slate-600 rounded-md p-3 text-slate-200 focus:ring-2 focus:ring-sky-500 transition",
            placeholder: "Nhập tên..."
          })]
        }), (0, jsxRuntime.jsxs)("div", {
          className: "p-4 border-t border-slate-700 bg-slate-900/30 flex justify-end gap-3",
          children: [(0, jsxRuntime.jsx)("button", {
            onClick: onClose,
            className: "px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 font-medium",
            children: "Hủy"
          }), (0, jsxRuntime.jsx)("button", {
            onClick: handleConfirm,
            className: "px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold",
            children: "Xác nhận"
          })]
        })]
      })
    }) : null;
  };
}
export function createMacroReference(getDependencies) {
  return function MacroReference() {
    const {
      react,
      macroReference,
      InlineCopyButton,
      jsxRuntime
    } = resolvePresetSectionDeps(getDependencies);
    let [isExpanded, setIsExpanded] = (0, react.useState)(false);
    return (0, jsxRuntime.jsxs)("details", {
      className: "bg-slate-800/50 rounded-xl shadow-lg open:mb-6   border border-slate-700/50",
      open: isExpanded,
      onToggle: e => setIsExpanded(e.target.open),
      children: [(0, jsxRuntime.jsxs)("summary", {
        className: "p-4 cursor-pointer text-md font-bold text-sky-400 list-none flex justify-between items-center hover:bg-slate-800/80 rounded-xl ",
        children: [(0, jsxRuntime.jsxs)("span", {
          className: "flex items-center gap-2",
          children: [(0, jsxRuntime.jsx)("svg", {
            "aria-hidden": "true",
            xmlns: "http://www.w3.org/2000/svg",
            className: "h-5 w-5",
            viewBox: "0 0 20 20",
            fill: "currentColor",
            children: (0, jsxRuntime.jsx)("path", {
              fillRule: "evenodd",
              d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z",
              clipRule: "evenodd"
            })
          }), "Tham khảo Biến giữ chỗ (Macros)"]
        }), (0, jsxRuntime.jsx)("svg", {
          "aria-hidden": "true",
          className: "w-5 h-5 text-slate-400    " + (isExpanded ? "rotate-180" : ""),
          xmlns: "http://www.w3.org/2000/svg",
          fill: "none",
          viewBox: "0 0 24 24",
          stroke: "currentColor",
          children: (0, jsxRuntime.jsx)("path", {
            strokeLinecap: "round",
            strokeLinejoin: "round",
            strokeWidth: "2",
            d: "M19 9l-7 7-7-7"
          })
        })]
      }), (0, jsxRuntime.jsx)("div", {
        className: "p-4 pt-0 grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto custom-scrollbar",
        children: macroReference.map(e => (0, jsxRuntime.jsx)(InlineCopyButton, {
          macro: e
        }, e.name))
      })]
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
    } = resolvePresetSectionDeps(getDependencies);
    let [filterMode, setFilterMode] = (0, react.useState)("all");
    let [movingPromptIndex, setMovingPromptIndex] = (0, react.useState)(null);
    let [editingPromptIndex, setEditingPromptIndex] = (0, react.useState)(null);
    let lastFocusedRef = (0, react.useRef)(null);
    let prompts = preset.prompts || [];
    let handleUpdatePrompt = (0, react.useCallback)((n, r) => {
      let a = [...prompts];
      a[n] = r;
      onUpdate({
        ...preset,
        prompts: a
      });
    }, [prompts, preset, onUpdate]);
    let handleRemovePrompt = (0, react.useCallback)(n => {
      movingPromptIndex === n && setMovingPromptIndex(null);
      let r = prompts.filter((e, t) => t !== n);
      onUpdate({
        ...preset,
        prompts: r
      });
    }, [prompts, preset, onUpdate, movingPromptIndex]);
    let handleAddPrompt = (0, react.useCallback)(() => {
      let n = {
        identifier: `prompt_${Date.now()}`,
        name: "New Prompt",
        role: "system",
        content: "",
        enabled: true,
        include_title: false
      };
      onUpdate({
        ...preset,
        prompts: [...prompts, n]
      });
    }, [prompts, preset, onUpdate]);
    let handleOpenEdit = (0, react.useCallback)(e => {
      lastFocusedRef.current = document.activeElement;
      setEditingPromptIndex(e);
    }, []);
    let handleCloseEdit = (0, react.useCallback)(() => {
      setEditingPromptIndex(null);
      setTimeout(() => lastFocusedRef.current?.focus(), 0);
    }, []);
    let handleSaveEdit = (0, react.useCallback)(e => {
      null !== editingPromptIndex && handleUpdatePrompt(editingPromptIndex, e);
      handleCloseEdit();
    }, [editingPromptIndex, handleUpdatePrompt, handleCloseEdit]);
    let filteredPrompts = (0, react.useMemo)(() => prompts.map((e, t) => ({
      prompt: e,
      originalIndex: t
    })).filter(({
      prompt: e
    }) => "enabled" === filterMode ? true === e.enabled : "disabled" !== filterMode || !e.enabled), [prompts, filterMode]);
    let handleMovePrompt = (0, react.useCallback)(n => {
      if (null === movingPromptIndex || movingPromptIndex === n) return void setMovingPromptIndex(null);
      let r = [...prompts];
      let [o] = r.splice(movingPromptIndex, 1);
      let s = n > movingPromptIndex ? n - 1 : n;
      r.splice(s, 0, o);
      onUpdate({
        ...preset,
        prompts: r
      });
      setMovingPromptIndex(null);
    }, [prompts, preset, onUpdate, movingPromptIndex]);
    let handleToggleAllVisible = (0, react.useCallback)(() => {
      if (!preset || 0 === filteredPrompts.length) return void alert("Không có lời nhắc nào để xuất cho bộ lọc hiện tại.");
      let t = "all" === filterMode ? filteredPrompts.map(({
        prompt: e
      }) => `--- Lời nhắc: ${e.name || "Không có tiêu đề"} ---\n\n${e.content || ""}`).join("\n\n\n") : filteredPrompts.map(({
        prompt: e
      }) => e.content || "").join("\n\n----------------------------------------\n\n");
      let r = new Blob([t], {
        type: "text/plain;charset=utf-8"
      });
      let a = URL.createObjectURL(r);
      let i = document.createElement("a");
      i.href = a;
      i.download = `${preset.name.replace(/\.json$/i, "")}_prompts_${filterMode}.txt`;
      document.body.appendChild(i);
      i.click();
      document.body.removeChild(i);
      URL.revokeObjectURL(a);
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
          prompt: e,
          originalIndex: t
        }) => (0, jsxRuntime.jsx)(PromptListItem, {
          prompt: e,
          index: t,
          onUpdate: handleUpdatePrompt,
          onRemove: handleRemovePrompt,
          movingPromptIndex: movingPromptIndex,
          onSelectToMove: setMovingPromptIndex,
          onMoveTo: handleMovePrompt,
          onCancelMove: () => setMovingPromptIndex(null),
          onEdit: handleOpenEdit
        }, e.identifier || t)), 0 === filteredPrompts.length && (0, jsxRuntime.jsx)("div", {
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
