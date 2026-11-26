// Source recovery from the last verified production host.
// Factories receive the existing React/runtime bindings lazily to preserve initialization order.
// Public props and injected dependencies have descriptive aliases; internal locals retain recovered names.
function resolveCharacterSectionDeps(getDependencies) {
  const deps = getDependencies();
  return {
    react: deps.react,
    jsxRuntime: deps.jsxRuntime,
    TextInput: deps.TextInput,
    TextArea: deps.TextArea,
    CollapsibleSection: deps.CollapsibleSection,
    ToggleSwitch: deps.ToggleSwitch,
    CopyButton: deps.CopyButton,
    LoadingIndicator: deps.LoadingIndicator,
    SectionNavigator: deps.SectionNavigator,
    useToast: deps.useToast,
    lorebookStore: deps.lorebookStore,
    RegexScriptEditor: deps.RegexScriptEditor,
    RegexScriptList: deps.RegexScriptList,
    TavernScriptEditor: deps.TavernScriptEditor,
    TavernScriptList: deps.TavernScriptList,
    CharacterCoreSection: deps.CharacterCoreSection,
    CharacterScenarioSection: deps.CharacterScenarioSection,
    CharacterMetadataSection: deps.CharacterMetadataSection,
    CharacterLorebookSection: deps.CharacterLorebookSection,
    CharacterExtensionsSection: deps.CharacterExtensionsSection,
    CharacterDialogueSection: deps.CharacterDialogueSection,
    MythicSection: deps.MythicSection,
    readProxyForTools: deps.readProxyForTools,
    generateProxyText: deps.generateProxyText,
    generateAiStudioToolText: deps.generateAiStudioToolText,
    resolveCurrentModel: deps.resolveCurrentModel,
    readConnectionSettings: deps.readConnectionSettings,
    createGeminiClient: deps.createGeminiClient,
    geminiSafetySettings: deps.geminiSafetySettings
  };
}
export function createCharacterCoreSection(getDependencies) {
  return function CharacterCoreSection({
    card: card,
    onChange: onChange
  }) {
    const {
      TextInput,
      TextArea,
      CollapsibleSection,
      jsxRuntime
    } = resolveCharacterSectionDeps(getDependencies);
    return (0, jsxRuntime.jsxs)(CollapsibleSection, {
      title: "Thông tin cốt lõi",
      description: "Định nghĩa cơ bản về danh tính nhân vật.",
      children: [(0, jsxRuntime.jsx)(TextInput, {
        label: "Tên",
        value: card.name,
        onChange: e => onChange("name", e.target.value)
      }), (0, jsxRuntime.jsx)(TextArea, {
        containerClassName: "col-span-full",
        label: "Mô tả",
        value: card.description,
        onChange: e => onChange("description", e.target.value),
        rows: 5
      }), (0, jsxRuntime.jsx)(TextArea, {
        containerClassName: "col-span-full",
        label: "Tính cách",
        value: card.personality || "",
        onChange: e => onChange("personality", e.target.value),
        rows: 5
      }), (0, jsxRuntime.jsx)(TextArea, {
        containerClassName: "col-span-full",
        label: "Vai trò (Persona)",
        value: card.char_persona || "",
        onChange: e => onChange("char_persona", e.target.value),
        rows: 5
      })]
    });
  };
}
export function createCharacterScenarioSection(getDependencies) {
  return function CharacterScenarioSection({
    card: card,
    onChange: onChange
  }) {
    const {
      TextArea,
      CollapsibleSection,
      jsxRuntime
    } = resolveCharacterSectionDeps(getDependencies);
    return (0, jsxRuntime.jsxs)(CollapsibleSection, {
      title: "Kịch bản & Lời nhắc",
      defaultOpen: false,
      description: "Bối cảnh, gợi ý hệ thống và các chỉ dẫn khác.",
      children: [(0, jsxRuntime.jsx)(TextArea, {
        containerClassName: "col-span-full",
        label: "Kịch bản",
        value: card.scenario || "",
        onChange: e => onChange("scenario", e.target.value)
      }), (0, jsxRuntime.jsx)(TextArea, {
        containerClassName: "col-span-full",
        label: "Gợi ý hệ thống",
        value: card.system_prompt || "",
        onChange: e => onChange("system_prompt", e.target.value)
      }), (0, jsxRuntime.jsx)(TextArea, {
        containerClassName: "col-span-full",
        label: "Chỉ dẫn sau lịch sử",
        value: card.post_history_instructions || "",
        onChange: e => onChange("post_history_instructions", e.target.value)
      })]
    });
  };
}
export function createCharacterLorebookSection(getDependencies) {
  return function CharacterLorebookSection({
    card: card,
    onOpenLorebook: onOpenLorebook
  }) {
    const {
      CollapsibleSection,
      jsxRuntime
    } = resolveCharacterSectionDeps(getDependencies);
    let entries = card.char_book?.entries || [];
    let enabledCount = entries.filter(e => false !== e.enabled).length;
    let attachedLorebooks = card.attached_lorebooks || [];
    return (0, jsxRuntime.jsx)(CollapsibleSection, {
      title: "Sổ tay & Thế giới (Lorebook)",
      defaultOpen: false,
      description: "Quản lý kiến thức nền, định nghĩa thế giới và các liên kết mở rộng.",
      children: (0, jsxRuntime.jsxs)("div", {
        className: "col-span-full space-y-4",
        children: [(0, jsxRuntime.jsxs)("div", {
          className: "bg-slate-700/30 rounded-lg p-6 border border-slate-600/50 flex flex-col sm:flex-row items-center justify-between gap-4",
          children: [(0, jsxRuntime.jsxs)("div", {
            className: "text-center sm:text-left space-y-1",
            children: [(0, jsxRuntime.jsx)("h4", {
              className: "text-lg font-bold text-slate-200",
              children: "Trạng thái Sổ tay"
            }), (0, jsxRuntime.jsxs)("p", {
              className: "text-sm text-slate-400",
              children: ["Nội bộ: ", (0, jsxRuntime.jsx)("span", {
                className: "font-mono text-sky-400 font-bold",
                children: entries.length
              }), " mục (", (0, jsxRuntime.jsx)("span", {
                className: "text-green-400",
                children: enabledCount
              }), " Bật)"]
            }), attachedLorebooks.length > 0 && (0, jsxRuntime.jsxs)("p", {
              className: "text-sm text-slate-400",
              children: ["Đang liên kết: ", (0, jsxRuntime.jsx)("span", {
                className: "font-mono text-amber-400 font-bold",
                children: attachedLorebooks.length
              }), " sổ tay ngoài"]
            })]
          }), (0, jsxRuntime.jsxs)("button", {
            onClick: onOpenLorebook,
            className: "bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-6 rounded-lg shadow-lg shadow-indigo-500/20   flex items-center gap-2",
            children: [(0, jsxRuntime.jsx)("svg", {
              "aria-hidden": "true",
              xmlns: "http://www.w3.org/2000/svg",
              className: "h-5 w-5",
              viewBox: "0 0 20 20",
              fill: "currentColor",
              children: (0, jsxRuntime.jsx)("path", {
                d: "M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"
              })
            }), "Mở Trình quản lý (Full Screen)"]
          })]
        }), attachedLorebooks.length > 0 && (0, jsxRuntime.jsxs)("div", {
          className: "flex flex-wrap gap-2 pt-2",
          children: [(0, jsxRuntime.jsx)("span", {
            className: "text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center h-6",
            children: "Liên kết:"
          }), attachedLorebooks.map((e, t) => (0, jsxRuntime.jsxs)("span", {
            className: "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-900/30 text-amber-400 border border-amber-700/50",
            children: [(0, jsxRuntime.jsx)("svg", {
              "aria-hidden": "true",
              xmlns: "http://www.w3.org/2000/svg",
              className: "h-3 w-3 mr-1",
              fill: "none",
              viewBox: "0 0 24 24",
              stroke: "currentColor",
              children: (0, jsxRuntime.jsx)("path", {
                strokeLinecap: "round",
                strokeLinejoin: "round",
                strokeWidth: "2",
                d: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
              })
            }), e]
          }, t))]
        })]
      })
    });
  };
}
export function createCharacterMetadataSection(getDependencies) {
  return function CharacterMetadataSection({
    card: card,
    onChange: onChange
  }) {
    const {
      react,
      TextInput,
      TextArea,
      CollapsibleSection,
      jsxRuntime,
      ToggleSwitch
    } = resolveCharacterSectionDeps(getDependencies);
    let fieldIdPrefix = (0, react.useId)();
    let [customFieldDrafts, setCustomFieldDrafts] = (0, react.useState)({});
    let knownFields = new Set(["name", "description", "personality", "char_persona", "first_mes", "mes_example", "scenario", "system_prompt", "post_history_instructions", "creator", "character_version", "tags", "creator_notes", "creatorcomment", "char_book", "character_book", "attached_lorebooks", "alternate_greetings", "group_only_greetings", "extensions", "data", "spec", "spec_version", "create_date", "avatar"]);
    let customFieldKeys = Object.keys(card).filter(e => !knownFields.has(e) && !e.startsWith("__"));
    (0, react.useEffect)(() => {
      let t = {};
      customFieldKeys.forEach(n => {
        let r = card[n];
        "object" == typeof r && r && (!Array.isArray(r) || !r.every(e => "string" == typeof e)) && (t[n] = {
          value: JSON.stringify(r, null, 2),
          isValid: true
        });
      });
      setCustomFieldDrafts(t);
    }, [card, customFieldKeys.join(",")]);
    let handleCustomFieldChange = (e, n) => {
      setCustomFieldDrafts(t => ({
        ...t,
        [e]: {
          ...t[e],
          value: n
        }
      }));
      try {
        let r = "" === n.trim() ? null : JSON.parse(n);
        setCustomFieldDrafts(t => ({
          ...t,
          [e]: {
            value: n,
            isValid: true
          }
        }));
        onChange(e, r);
      } catch {
        setCustomFieldDrafts(t => ({
          ...t,
          [e]: {
            value: n,
            isValid: false
          }
        }));
      }
    };
    return (0, jsxRuntime.jsxs)(CollapsibleSection, {
      title: "Siêu dữ liệu & Ghi chú",
      defaultOpen: false,
      description: "Thông tin bổ sung về thẻ nhân vật này.",
      children: [(0, jsxRuntime.jsx)(TextInput, {
        label: "Người tạo",
        value: card.creator || "",
        onChange: e => onChange("creator", e.target.value)
      }), (0, jsxRuntime.jsx)(TextInput, {
        label: "Phiên bản nhân vật",
        value: card.character_version || "",
        onChange: e => onChange("character_version", e.target.value)
      }), (0, jsxRuntime.jsxs)("div", {
        className: "col-span-full",
        children: [(0, jsxRuntime.jsx)("label", {
          htmlFor: fieldIdPrefix,
          className: "block text-sm font-medium text-slate-300 mb-1",
          children: "Thẻ (phân tách bằng dấu phẩy)"
        }), (0, jsxRuntime.jsx)("div", {
          className: "relative",
          children: (0, jsxRuntime.jsx)("input", {
            id: fieldIdPrefix,
            type: "text",
            value: card.tags?.join(", ") || "",
            onChange: e => {
              onChange("tags", e.target.value.split(",").map(e => e.trim()).filter(Boolean));
            },
            className: "w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition",
            placeholder: "fantasy, sci-fi, isekai"
          })
        })]
      }), (0, jsxRuntime.jsx)(TextArea, {
        containerClassName: "col-span-full",
        label: "Ghi chú của người tạo",
        value: card.creator_notes || "",
        onChange: e => onChange("creator_notes", e.target.value)
      }), (0, jsxRuntime.jsx)(TextArea, {
        containerClassName: "col-span-full",
        label: "Nhận xét của người tạo (V3)",
        value: card.creatorcomment || "",
        onChange: e => onChange("creatorcomment", e.target.value)
      }), customFieldKeys.length > 0 && (0, jsxRuntime.jsxs)("div", {
        className: "col-span-full border-t border-slate-700 pt-4 mt-2",
        children: [(0, jsxRuntime.jsx)("h4", {
          className: "text-sm font-bold text-slate-400 mb-2",
          children: "Trường dữ liệu mở rộng"
        }), (0, jsxRuntime.jsx)("div", {
          className: "grid grid-cols-1 gap-4",
          children: customFieldKeys.map(n => {
            let a = card[n];
            if (Array.isArray(a) && a.every(e => "string" == typeof e)) return (0, jsxRuntime.jsx)(TextArea, {
              label: `${n} (Mỗi mục phân tách bằng '---')`,
              value: a.join("\n---\n"),
              onChange: e => onChange(n, e.target.value.split("\n---\n").map(e => e.trim())),
              rows: 5
            }, n);
            if ("string" == typeof a) return (0, jsxRuntime.jsx)(TextArea, {
              label: n,
              value: a,
              onChange: e => onChange(n, e.target.value)
            }, n);
            if ("boolean" == typeof a) return (0, jsxRuntime.jsx)("div", {
              children: (0, jsxRuntime.jsx)(ToggleSwitch, {
                label: n,
                checked: a,
                onChange: e => onChange(n, e)
              })
            }, n);
            if ("number" == typeof a) return (0, jsxRuntime.jsx)(TextInput, {
              label: n,
              type: "number",
              value: String(a),
              onChange: e => onChange(n, parseFloat(e.target.value) || 0)
            }, n);
            if ("object" == typeof a && a) {
              let e = customFieldDrafts[n] || {
                value: "",
                isValid: true
              };
              return (0, jsxRuntime.jsxs)("div", {
                children: [(0, jsxRuntime.jsx)(TextArea, {
                  label: `JSON: ${n}`,
                  value: e.value,
                  onChange: e => handleCustomFieldChange(n, e.target.value),
                  rows: 8,
                  className: "font-mono text-xs " + (e.isValid ? "" : "border-red-500")
                }), !e.isValid && (0, jsxRuntime.jsx)("p", {
                  className: "text-sm text-red-400 mt-1",
                  children: "JSON không hợp lệ."
                })]
              }, n);
            }
            return null;
          })
        })]
      })]
    });
  };
}
export function createRegexScriptEditor(getDependencies) {
  return function RegexScriptEditor({
    script: script,
    index: index,
    onUpdate: onUpdate,
    onRemove: onRemove
  }) {
    const {
      react,
      TextInput,
      TextArea,
      jsxRuntime,
      ToggleSwitch
    } = resolveCharacterSectionDeps(getDependencies);
    let [isExpanded, setIsExpanded] = (0, react.useState)(false);
    let updateField = (r, a) => {
      onUpdate(index, {
        ...script,
        [r]: a
      });
    };
    return (0, jsxRuntime.jsxs)("div", {
      className: "bg-slate-800 rounded-lg border border-slate-700 ",
      children: [(0, jsxRuntime.jsxs)("div", {
        className: "flex items-center p-3",
        children: [(0, jsxRuntime.jsx)("div", {
          className: "flex items-center gap-2 flex-shrink-0 mr-4",
          onClick: e => e.stopPropagation(),
          children: (0, jsxRuntime.jsx)(ToggleSwitch, {
            label: "",
            ariaLabel: `Bật kịch bản ${script.scriptName || "Kịch bản không tên"}`,
            checked: !script.disabled,
            onChange: e => updateField("disabled", !e),
            className: "bg-transparent p-0"
          })
        }), (0, jsxRuntime.jsx)("button", {
          type: "button",
          className: "flex-grow cursor-pointer text-left",
          onClick: () => setIsExpanded(!isExpanded),
          "aria-expanded": isExpanded,
          children: (0, jsxRuntime.jsx)("span", {
            className: "font-medium truncate " + (script.disabled ? "text-slate-500 line-through" : "text-slate-200"),
            children: script.scriptName || "Kịch bản không tên"
          })
        }), (0, jsxRuntime.jsxs)("div", {
          className: "flex items-center ml-4 flex-shrink-0",
          children: [(0, jsxRuntime.jsx)("button", {
            onClick: e => {
              e.stopPropagation();
              onRemove(index);
            },
            className: "text-slate-500 hover:text-red-400  p-1",
            "aria-label": `Xóa kịch bản "${script.scriptName}"`,
            children: (0, jsxRuntime.jsx)("svg", {
              xmlns: "http://www.w3.org/2000/svg",
              className: "h-5 w-5",
              viewBox: "0 0 20 20",
              fill: "currentColor",
              "aria-hidden": "true",
              children: (0, jsxRuntime.jsx)("path", {
                fillRule: "evenodd",
                d: "M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z",
                clipRule: "evenodd"
              })
            })
          }), (0, jsxRuntime.jsx)("button", {
            onClick: () => setIsExpanded(!isExpanded),
            className: "p-1 text-slate-400",
            "aria-label": isExpanded ? "Thu gọn kịch bản" : "Mở rộng kịch bản",
            children: (0, jsxRuntime.jsx)("svg", {
              xmlns: "http://www.w3.org/2000/svg",
              className: "h-6 w-6 text-slate-400  " + (isExpanded ? "rotate-180" : ""),
              viewBox: "0 0 20 20",
              fill: "currentColor",
              "aria-hidden": "true",
              children: (0, jsxRuntime.jsx)("path", {
                fillRule: "evenodd",
                d: "M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z",
                clipRule: "evenodd"
              })
            })
          })]
        })]
      }), isExpanded && (0, jsxRuntime.jsxs)("div", {
        className: "p-4 border-t border-slate-700/50 space-y-4",
        children: [(0, jsxRuntime.jsx)(TextInput, {
          label: "Tên Kịch bản",
          value: script.scriptName || "",
          onChange: e => updateField("scriptName", e.target.value)
        }), (0, jsxRuntime.jsx)(TextArea, {
          label: "Biểu thức Regex Tìm kiếm",
          value: script.findRegex || "",
          onChange: e => updateField("findRegex", e.target.value),
          rows: 3
        }), (0, jsxRuntime.jsx)(TextArea, {
          label: "Chuỗi Thay thế (HTML/Văn bản)",
          value: script.replaceString || "",
          onChange: e => updateField("replaceString", e.target.value),
          rows: 15
        })]
      })]
    });
  };
}
export function createTavernScriptEditor(getDependencies) {
  return function TavernScriptEditor({
    script: script,
    index: index,
    onUpdate: onUpdate,
    onRemove: onRemove
  }) {
    const {
      react,
      TextInput,
      TextArea,
      jsxRuntime,
      ToggleSwitch
    } = resolveCharacterSectionDeps(getDependencies);
    let [isExpanded, setIsExpanded] = (0, react.useState)(false);
    let updateField = (r, a) => {
      onUpdate(index, {
        ...script,
        value: {
          ...(script?.value || {}),
          [r]: a
        }
      });
    };
    return (0, jsxRuntime.jsxs)("div", {
      className: "bg-slate-800 rounded-lg border border-slate-700",
      children: [(0, jsxRuntime.jsxs)("div", {
        className: "flex items-center p-3",
        children: [(0, jsxRuntime.jsx)("div", {
          className: "flex items-center gap-2 flex-shrink-0 mr-4",
          onClick: e => e.stopPropagation(),
          children: (0, jsxRuntime.jsx)(ToggleSwitch, {
            label: "",
            ariaLabel: `Bật kịch bản ${script?.value?.name || "Kịch bản không tên"}`,
            checked: script?.value?.enabled ?? false,
            onChange: e => updateField("enabled", e),
            clean: true
          })
        }), (0, jsxRuntime.jsx)("button", {
          type: "button",
          className: "flex-grow cursor-pointer text-left",
          onClick: () => setIsExpanded(!isExpanded),
          "aria-expanded": isExpanded,
          children: (0, jsxRuntime.jsx)("span", {
            className: "font-medium truncate " + (script?.value?.enabled ? "text-slate-200" : "text-slate-500 line-through"),
            children: script?.value?.name || "Kịch bản không tên"
          })
        }), (0, jsxRuntime.jsxs)("div", {
          className: "flex items-center ml-4 flex-shrink-0",
          children: [(0, jsxRuntime.jsx)("button", {
            onClick: e => {
              e.stopPropagation();
              onRemove(index);
            },
            className: "text-slate-500 hover:text-red-400  p-1",
            "aria-label": `Xóa kịch bản "${script?.value?.name || ""}"`,
            children: (0, jsxRuntime.jsx)("svg", {
              xmlns: "http://www.w3.org/2000/svg",
              className: "h-5 w-5",
              viewBox: "0 0 20 20",
              fill: "currentColor",
              "aria-hidden": "true",
              children: (0, jsxRuntime.jsx)("path", {
                fillRule: "evenodd",
                d: "M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z",
                clipRule: "evenodd"
              })
            })
          }), (0, jsxRuntime.jsx)("button", {
            onClick: () => setIsExpanded(!isExpanded),
            className: "p-1 text-slate-400",
            "aria-label": isExpanded ? "Thu gọn" : "Mở rộng",
            children: (0, jsxRuntime.jsx)("svg", {
              xmlns: "http://www.w3.org/2000/svg",
              className: "h-6 w-6  " + (isExpanded ? "rotate-180" : ""),
              viewBox: "0 0 20 20",
              fill: "currentColor",
              "aria-hidden": "true",
              children: (0, jsxRuntime.jsx)("path", {
                fillRule: "evenodd",
                d: "M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z",
                clipRule: "evenodd"
              })
            })
          })]
        })]
      }), isExpanded && (0, jsxRuntime.jsxs)("div", {
        className: "p-4 border-t border-slate-700/50 space-y-4",
        children: [(0, jsxRuntime.jsx)(TextInput, {
          label: "Tên Kịch bản",
          value: script?.value?.name || "",
          onChange: e => updateField("name", e.target.value)
        }), (0, jsxRuntime.jsx)("div", {
          className: "relative",
          children: (0, jsxRuntime.jsx)(TextArea, {
            label: "Nội dung",
            value: script?.value?.content || "",
            onChange: e => updateField("content", e.target.value),
            rows: 15,
            className: "font-mono text-xs"
          })
        })]
      })]
    });
  };
}
export function createRegexScriptList(getDependencies) {
  return function RegexScriptList({
    scripts = [],
    onUpdate: onUpdate
  }) {
    const {
      react,
      jsxRuntime,
      RegexScriptEditor
    } = resolveCharacterSectionDeps(getDependencies);
    let handleUpdateScript = (0, react.useCallback)((n, r) => {
      let a = [...scripts];
      a[n] = r;
      onUpdate(a);
    }, [scripts, onUpdate]);
    let handleRemoveScript = (0, react.useCallback)(n => {
      onUpdate(scripts.filter((e, t) => t !== n));
    }, [scripts, onUpdate]);
    let handleAddScript = (0, react.useCallback)(() => {
      let n = {
        id: `regex_${Date.now()}`,
        scriptName: "Kịch bản Mới",
        findRegex: "",
        replaceString: "",
        disabled: false,
        placement: [2],
        promptOnly: false,
        runOnEdit: false
      };
      onUpdate([...scripts, n]);
    }, [scripts, onUpdate]);
    return (0, jsxRuntime.jsxs)("div", {
      className: "space-y-3",
      children: [scripts.map((e, t) => (0, jsxRuntime.jsx)(RegexScriptEditor, {
        script: e,
        index: t,
        onUpdate: handleUpdateScript,
        onRemove: handleRemoveScript
      }, e.id || t)), (0, jsxRuntime.jsxs)("button", {
        onClick: handleAddScript,
        className: "w-full mt-2 bg-slate-700 hover:bg-slate-600 text-sky-400 font-semibold py-2 px-4 rounded-lg   flex items-center justify-center gap-2 border border-slate-600",
        children: [(0, jsxRuntime.jsx)("svg", {
          xmlns: "http://www.w3.org/2000/svg",
          className: "h-5 w-5",
          viewBox: "0 0 20 20",
          fill: "currentColor",
          "aria-hidden": "true",
          children: (0, jsxRuntime.jsx)("path", {
            fillRule: "evenodd",
            d: "M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z",
            clipRule: "evenodd"
          })
        }), (0, jsxRuntime.jsx)("span", {
          children: "Thêm Kịch bản"
        })]
      })]
    });
  };
}
export function createTavernScriptList(getDependencies) {
  return function TavernScriptList({
    scripts = [],
    onUpdate: onUpdate
  }) {
    const {
      react,
      TavernScriptEditor,
      jsxRuntime
    } = resolveCharacterSectionDeps(getDependencies);
    let handleUpdateScript = (0, react.useCallback)((n, r) => {
      let a = [...scripts];
      a[n] = r;
      onUpdate(a);
    }, [scripts, onUpdate]);
    let handleRemoveScript = (0, react.useCallback)(n => {
      onUpdate(scripts.filter((e, t) => t !== n));
    }, [scripts, onUpdate]);
    let handleAddScript = (0, react.useCallback)(() => {
      let n = {
        type: "script",
        value: {
          id: `tavern_${Date.now()}`,
          name: "Kịch bản Mới",
          content: "",
          enabled: true
        }
      };
      onUpdate([...scripts, n]);
    }, [scripts, onUpdate]);
    return (0, jsxRuntime.jsxs)("div", {
      className: "space-y-3",
      children: [scripts.map((e, t) => (0, jsxRuntime.jsx)(TavernScriptEditor, {
        script: e,
        index: t,
        onUpdate: handleUpdateScript,
        onRemove: handleRemoveScript
      }, e?.value?.id || t)), (0, jsxRuntime.jsxs)("button", {
        onClick: handleAddScript,
        className: "w-full mt-2 bg-slate-700 hover:bg-slate-600 text-sky-400 font-semibold py-2 px-4 rounded-lg   flex items-center justify-center gap-2 border border-slate-600",
        children: [(0, jsxRuntime.jsx)("svg", {
          xmlns: "http://www.w3.org/2000/svg",
          className: "h-5 w-5",
          viewBox: "0 0 20 20",
          fill: "currentColor",
          "aria-hidden": "true",
          children: (0, jsxRuntime.jsx)("path", {
            fillRule: "evenodd",
            d: "M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z",
            clipRule: "evenodd"
          })
        }), (0, jsxRuntime.jsx)("span", {
          children: "Thêm Kịch bản Tavern Helper"
        })]
      })]
    });
  };
}
export function createCharacterExtensionsSection(getDependencies) {
  return function CharacterExtensionsSection({
    card: card,
    onRegexUpdate: onRegexUpdate,
    onTavernUpdate: onTavernUpdate,
    onExtensionsReplace: onExtensionsReplace
  }) {
    const {
      RegexScriptList,
      react,
      TextArea,
      TavernScriptList,
      CollapsibleSection,
      jsxRuntime
    } = resolveCharacterSectionDeps(getDependencies);
    let [rawExtensionsJson, setRawExtensionsJson] = (0, react.useState)("{}");
    let [isValidJson, setIsValidJson] = (0, react.useState)(true);
    let otherExtensions = (0, react.useMemo)(() => {
      let t = {
        ...(card.extensions || {})
      };
      delete t.regex_scripts;
      delete t.TavernHelper_scripts;
      return t;
    }, [card.extensions]);
    (0, react.useEffect)(() => {
      setRawExtensionsJson(JSON.stringify(otherExtensions, null, 2));
      setIsValidJson(true);
    }, [otherExtensions]);
    return (0, jsxRuntime.jsxs)(CollapsibleSection, {
      title: "Phần mở rộng (Nâng cao)",
      defaultOpen: false,
      description: "Quản lý các kịch bản và dữ liệu JSON thô.",
      children: [(0, jsxRuntime.jsxs)("div", {
        className: "col-span-full",
        children: [(0, jsxRuntime.jsx)("h4", {
          className: "text-lg font-semibold text-slate-300 mb-4",
          children: "Trình chỉnh sửa Kịch bản Tavern Helper"
        }), (0, jsxRuntime.jsx)(TavernScriptList, {
          scripts: card.extensions?.TavernHelper_scripts || [],
          onUpdate: onTavernUpdate
        })]
      }), (0, jsxRuntime.jsxs)("div", {
        className: "col-span-full mt-6",
        children: [(0, jsxRuntime.jsx)("h4", {
          className: "text-lg font-semibold text-slate-300 mb-4",
          children: "Trình chỉnh sửa Kịch bản Regex"
        }), (0, jsxRuntime.jsx)(RegexScriptList, {
          scripts: card.extensions?.regex_scripts || [],
          onUpdate: onRegexUpdate
        })]
      }), (0, jsxRuntime.jsxs)("div", {
        className: "col-span-full border-t border-slate-700 my-6 pt-4",
        children: [(0, jsxRuntime.jsx)("h4", {
          className: "text-lg font-semibold text-slate-300 mb-4",
          children: "Trình chỉnh sửa JSON thô (Các trường mở rộng còn lại)"
        }), (0, jsxRuntime.jsx)(TextArea, {
          label: "Các trường JSON chưa được xử lý trong 'extensions'",
          value: rawExtensionsJson,
          onChange: e => {
            let t = e.target.value;
            setRawExtensionsJson(t);
            try {
              let e = "" === t.trim() ? {} : JSON.parse(t);
              if (!e || "object" != typeof e || Array.isArray(e)) throw Error("Extensions phải là một đối tượng JSON.");
              onExtensionsReplace(e);
              setIsValidJson(true);
            } catch {
              setIsValidJson(false);
            }
          },
          rows: 10,
          className: "font-mono text-xs " + (isValidJson ? "" : "border-red-500 focus:ring-red-500 focus:border-red-500")
        }), !isValidJson && (0, jsxRuntime.jsx)("p", {
          className: "text-sm text-red-400 mt-1",
          children: "JSON không hợp lệ."
        })]
      })]
    });
  };
}
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
    } = resolveCharacterSectionDeps(getDependencies);
    let allGreetings = (0, react.useMemo)(() => [card.first_mes, ...(card.alternate_greetings || [])], [card.first_mes, card.alternate_greetings]);
    let fieldIdPrefix = (0, react.useId)();
    let [isGeneratingGreeting, setIsGeneratingGreeting] = (0, react.useState)(false);
    let {
      showToast: showToast
    } = useToast();
    let handleGreetingChange = (n, a) => {
      let i = [...allGreetings];
      i[n] = a;
      let [o, ...s] = i;
      onUpdate({
        ...card,
        first_mes: o,
        alternate_greetings: s.length > 0 ? s : []
      });
    };
    let handleRemoveGreeting = n => {
      if (allGreetings.length <= 1) return;
      let [a, ...i] = allGreetings.filter((e, t) => t !== n);
      onUpdate({
        ...card,
        first_mes: a,
        alternate_greetings: i.length > 0 ? i : []
      });
    };
    let handlePromoteGreeting = n => {
      if (0 === n) return;
      let a = [...allGreetings];
      let i = a.splice(n, 1)[0];
      a.unshift(i);
      let [o, ...s] = a;
      onUpdate({
        ...card,
        first_mes: o,
        alternate_greetings: s
      });
    };
    let groupOnlyGreetings = card.group_only_greetings || [];
    let handleGroupGreetingChange = (n, r) => {
      let a = [...groupOnlyGreetings];
      a[n] = r;
      onUpdate({
        ...card,
        group_only_greetings: a
      });
    };
    let handleRemoveGroupGreeting = n => onUpdate({
      ...card,
      group_only_greetings: groupOnlyGreetings.filter((e, t) => t !== n)
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
              let n = await async function (e, t = "gemini-3-flash-preview") {
                let n = `... (Prompt Logic) ... \n${JSON.stringify(e)}`;
                let r = "{}";
                try {
                  if (readConnectionSettings().source === "aistudio") {
                    let e = readConnectionSettings();
                    r = await generateAiStudioToolText(n, e.aistudio_tool_model || e.aistudio_model || t);
                  } else if (readProxyForTools()) {
                    let e = readConnectionSettings();
                    r = await generateProxyText(n, e.proxy_tool_model || e.proxy_model || t, e.proxy_protocol);
                  } else r = (await createGeminiClient().models.generateContent({
                    model: t,
                    contents: n,
                    config: {
                      responseMimeType: "application/json",
                      safetySettings: geminiSafetySettings
                    }
                  })).text || "{}";
                  return JSON.parse(r);
                } catch (e) {
                  throw Error(e.message || "Lỗi dịch thuật từ AI.");
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
                first_mes: n.first_mes,
                alternate_greetings: n.alternate_greetings,
                group_only_greetings: n.group_only_greetings
              });
              showToast("Đã dịch xong toàn bộ lời chào!", "success");
            } catch (e) {
              console.error(e);
              showToast(`Lỗi dịch thuật: ${e instanceof Error ? e.message : String(e)}`, "error");
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
              children: "✨"
            }), " Dịch toàn bộ Lời chào (AI)"]
          })
        })
      }), (0, jsxRuntime.jsxs)("div", {
        className: "space-y-4",
        children: [allGreetings.map((e, t) => (0, jsxRuntime.jsxs)("div", {
          className: "bg-slate-700/50 p-4 rounded-lg " + (isGeneratingGreeting ? "opacity-50 pointer-events-none" : ""),
          children: [(0, jsxRuntime.jsxs)("div", {
            className: "flex justify-between items-center mb-2",
            children: [(0, jsxRuntime.jsx)("label", {
              htmlFor: `${fieldIdPrefix}-${t}`,
              className: "text-sm font-bold text-slate-300",
              children: 0 === t ? "Lời chào Chính (first_mes)" : `Lời chào Thay thế #${t}`
            }), (0, jsxRuntime.jsxs)("div", {
              className: "flex items-center gap-2",
              children: [t > 0 && (0, jsxRuntime.jsx)("button", {
                onClick: () => handlePromoteGreeting(t),
                className: "text-xs bg-sky-700 hover:bg-sky-600 text-white font-semibold py-1 px-2 rounded-md ",
                children: "Đặt làm Chính"
              }), allGreetings.length > 1 && (0, jsxRuntime.jsx)("button", {
                onClick: () => handleRemoveGreeting(t),
                className: "text-slate-400 hover:text-red-400",
                "aria-label": `Xóa lời chào số ${t}`,
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
              id: `${fieldIdPrefix}-${t}`,
              value: e,
              onChange: e => handleGreetingChange(t, e.target.value),
              rows: 8,
              disabled: isGeneratingGreeting,
              className: "w-full bg-slate-700 border border-slate-600 rounded-md p-2 pr-10 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition disabled:bg-slate-800 disabled:text-slate-500"
            }), (0, jsxRuntime.jsx)(CopyButton, {
              textToCopy: e,
              absolute: true
            })]
          })]
        }, t)), (0, jsxRuntime.jsxs)("button", {
          onClick: () => {
            let [n, ...a] = [...allGreetings, ""];
            onUpdate({
              ...card,
              first_mes: n,
              alternate_greetings: a
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
        }), groupOnlyGreetings.map((e, t) => (0, jsxRuntime.jsxs)("div", {
          className: "bg-slate-700/50 p-4 rounded-lg",
          children: [(0, jsxRuntime.jsxs)("div", {
            className: "flex justify-between items-center mb-2",
            children: [(0, jsxRuntime.jsxs)("label", {
              className: "text-sm font-bold text-slate-300",
              children: ["Lời chào Nhóm #", t + 1]
            }), (0, jsxRuntime.jsx)("button", {
              onClick: () => handleRemoveGroupGreeting(t),
              className: "text-slate-400 hover:text-red-400",
              "aria-label": `Xóa lời chào nhóm số ${t + 1}`,
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
              value: e,
              onChange: e => handleGroupGreetingChange(t, e.target.value),
              "aria-label": `Lời chào Nhóm ${t + 1}`,
              rows: 4,
              className: "w-full bg-slate-700 border border-slate-600 rounded-md p-2 pr-10 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
            }), (0, jsxRuntime.jsx)(CopyButton, {
              textToCopy: e,
              absolute: true
            })]
          })]
        }, t)), (0, jsxRuntime.jsxs)("button", {
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
        onChange: e => onChange("mes_example", e.target.value),
        rows: 8
      })]
    });
  };
}
export function createCharacterDetailSections(getDependencies) {
  return function CharacterDetailSections({
    card: card,
    onUpdate: onUpdate,
    onOpenLorebook: onOpenLorebook
  }) {
    const {
      MythicSection,
      CharacterExtensionsSection,
      SectionNavigator,
      react,
      CharacterMetadataSection,
      CharacterScenarioSection,
      CharacterDialogueSection,
      CharacterCoreSection,
      lorebookStore,
      CharacterLorebookSection,
      jsxRuntime
    } = resolveCharacterSectionDeps(getDependencies);
    let {
      handleChange: handleChange,
      handleImportLorebook: handleImportLorebook,
      handleRegexScriptsUpdate: handleRegexScriptsUpdate,
      handleTavernScriptsUpdate: handleTavernScriptsUpdate,
      availableLorebooks: availableLorebooks
    } = ((targetCard, updateCard) => {
      let {
        lorebooks
      } = lorebookStore();
      let onFieldChange = (0, react.useCallback)((fieldKey, fieldValue) => {
        updateCard({
          ...targetCard,
          [fieldKey]: fieldValue
        });
      }, [targetCard, updateCard]);
      let onImportLorebook = (0, react.useCallback)(lorebookName => {
        if (!lorebookName) return;
        let matchedLorebook = lorebooks.find(item => item.name === lorebookName);
        if (!matchedLorebook || !matchedLorebook.book) return;
        let sourceEntries = matchedLorebook.book.entries || [];
        if (0 === sourceEntries.length) {
          alert("Sổ tay này không có mục nào để nhập.");
          return;
        }
        let clonedEntries = JSON.parse(JSON.stringify(sourceEntries));
        clonedEntries.forEach(entry => {
          entry.source_lorebook = matchedLorebook.name;
          entry.uid = `imported_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          if (undefined === entry.enabled) {
            entry.enabled = true;
          }
        });
        let mergedEntries = [...(targetCard.char_book?.entries || []), ...clonedEntries];
        updateCard({
          ...targetCard,
          char_book: {
            ...(targetCard.char_book || {
              entries: []
            }),
            entries: mergedEntries
          }
        });
        alert(`Đã nhập thành công ${sourceEntries.length} mục!`);
      }, [targetCard, updateCard, lorebooks]);
      let onExtensionChange = (0, react.useCallback)((extensionKey, extensionValue) => {
        let nextExtensions = {
          ...(targetCard.extensions || {})
        };
        let isEmptyScriptList = ("regex_scripts" === extensionKey || "TavernHelper_scripts" === extensionKey) && Array.isArray(extensionValue) && 0 === extensionValue.length;
        if (undefined === extensionValue || isEmptyScriptList) {
          delete nextExtensions[extensionKey];
        } else {
          nextExtensions[extensionKey] = extensionValue;
        }
        updateCard({
          ...targetCard,
          extensions: nextExtensions
        });
      }, [targetCard, updateCard]);
      return {
        handleChange: onFieldChange,
        handleImportLorebook: onImportLorebook,
        handleRegexScriptsUpdate: (0, react.useCallback)(scripts => {
          onExtensionChange("regex_scripts", scripts);
        }, [onExtensionChange]),
        handleTavernScriptsUpdate: (0, react.useCallback)(scripts => {
          onExtensionChange("TavernHelper_scripts", scripts);
        }, [onExtensionChange]),
        availableLorebooks: lorebooks
      };
    })(card, onUpdate);
    return (0, jsxRuntime.jsxs)("div", {
      className: "character-editor space-y-4",
      children: [(0, jsxRuntime.jsx)(SectionNavigator, {
        items: [{
          label: "Cốt lõi",
          target: "Thông tin cốt lõi"
        }, {
          label: "Đối thoại",
          target: "Đối thoại"
        }, {
          label: "Lời nhắc",
          target: "Kịch bản & Lời nhắc"
        }, {
          label: "Lorebook",
          target: "Sổ tay & Thế giới"
        }, {
          label: "Nâng cao",
          target: "Phần mở rộng"
        }]
      }), (0, jsxRuntime.jsx)(CharacterCoreSection, {
        card: card,
        onChange: handleChange
      }), (0, jsxRuntime.jsx)(MythicSection, {
        card: card,
        onUpdate: onUpdate
      }), (0, jsxRuntime.jsx)(CharacterDialogueSection, {
        card: card,
        onUpdate: onUpdate,
        onChange: handleChange
      }), (0, jsxRuntime.jsx)(CharacterScenarioSection, {
        card: card,
        onChange: handleChange
      }), (0, jsxRuntime.jsx)(CharacterMetadataSection, {
        card: card,
        onChange: handleChange
      }), (0, jsxRuntime.jsx)(CharacterLorebookSection, {
        card: card,
        availableLorebooks: availableLorebooks,
        onOpenLorebook: onOpenLorebook,
        onImport: handleImportLorebook
      }), (0, jsxRuntime.jsx)(CharacterExtensionsSection, {
        card: card,
        onRegexUpdate: handleRegexScriptsUpdate,
        onTavernUpdate: handleTavernScriptsUpdate,
        onExtensionsReplace: n => {
          let r = {};
          card.extensions?.regex_scripts && (r.regex_scripts = card.extensions.regex_scripts);
          card.extensions?.TavernHelper_scripts && (r.TavernHelper_scripts = card.extensions.TavernHelper_scripts);
          onUpdate({
            ...card,
            extensions: {
              ...n,
              ...r
            }
          });
        }
      })]
    });
  };
}
