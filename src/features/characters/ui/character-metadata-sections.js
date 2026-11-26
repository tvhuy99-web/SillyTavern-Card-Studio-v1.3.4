// Factories receive the existing React/runtime bindings lazily via getDependencies().
// Mechanically extracted for F02.07 while preserving original component logic and contracts.

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
    } = getDependencies();
    return (0, jsxRuntime.jsxs)(CollapsibleSection, {
      title: "Thông tin cốt lõi",
      description: "Định nghĩa cơ bản về danh tính nhân vật.",
      children: [(0, jsxRuntime.jsx)(TextInput, {
        label: "Tên",
        value: card.name,
        onChange: event => onChange("name", event.target.value)
      }), (0, jsxRuntime.jsx)(TextArea, {
        containerClassName: "col-span-full",
        label: "Mô tả",
        value: card.description,
        onChange: event => onChange("description", event.target.value),
        rows: 5
      }), (0, jsxRuntime.jsx)(TextArea, {
        containerClassName: "col-span-full",
        label: "Tính cách",
        value: card.personality || "",
        onChange: event => onChange("personality", event.target.value),
        rows: 5
      }), (0, jsxRuntime.jsx)(TextArea, {
        containerClassName: "col-span-full",
        label: "Vai trò (Persona)",
        value: card.char_persona || "",
        onChange: event => onChange("char_persona", event.target.value),
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
    } = getDependencies();
    return (0, jsxRuntime.jsxs)(CollapsibleSection, {
      title: "Kịch bản & Lời nhắc",
      defaultOpen: false,
      description: "Bối cảnh, gợi ý hệ thống và các chỉ dẫn khác.",
      children: [(0, jsxRuntime.jsx)(TextArea, {
        containerClassName: "col-span-full",
        label: "Kịch bản",
        value: card.scenario || "",
        onChange: event => onChange("scenario", event.target.value)
      }), (0, jsxRuntime.jsx)(TextArea, {
        containerClassName: "col-span-full",
        label: "Gợi ý hệ thống",
        value: card.system_prompt || "",
        onChange: event => onChange("system_prompt", event.target.value)
      }), (0, jsxRuntime.jsx)(TextArea, {
        containerClassName: "col-span-full",
        label: "Chỉ dẫn sau lịch sử",
        value: card.post_history_instructions || "",
        onChange: event => onChange("post_history_instructions", event.target.value)
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
    } = getDependencies();
    let entries = card.char_book?.entries || [];
    let enabledCount = entries.filter(entry => false !== entry.enabled).length;
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
          }), attachedLorebooks.map((lorebookName, index) => (0, jsxRuntime.jsxs)("span", {
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
            }), lorebookName]
          }, index))]
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
    } = getDependencies();
    let fieldIdPrefix = (0, react.useId)();
    let [customFieldDrafts, setCustomFieldDrafts] = (0, react.useState)({});
    let knownFields = new Set(["name", "description", "personality", "char_persona", "first_mes", "mes_example", "scenario", "system_prompt", "post_history_instructions", "creator", "character_version", "tags", "creator_notes", "creatorcomment", "char_book", "character_book", "attached_lorebooks", "alternate_greetings", "group_only_greetings", "extensions", "data", "spec", "spec_version", "create_date", "avatar"]);
    let customFieldKeys = Object.keys(card).filter(field => !knownFields.has(field) && !field.startsWith("__"));
    (0, react.useEffect)(() => {
      let drafts = {};
      customFieldKeys.forEach(field => {
        let fieldValue = card[field];
        "object" == typeof fieldValue && fieldValue && (!Array.isArray(fieldValue) || !fieldValue.every(item => "string" == typeof item)) && (drafts[field] = {
          value: JSON.stringify(fieldValue, null, 2),
          isValid: true
        });
      });
      setCustomFieldDrafts(drafts);
    }, [card, customFieldKeys.join(",")]);
    let handleCustomFieldChange = (field, jsonText) => {
      setCustomFieldDrafts(previousDrafts => ({
        ...previousDrafts,
        [field]: {
          ...previousDrafts[field],
          value: jsonText
        }
      }));
      try {
        let parsedValue = "" === jsonText.trim() ? null : JSON.parse(jsonText);
        setCustomFieldDrafts(previousDrafts => ({
          ...previousDrafts,
          [field]: {
            value: jsonText,
            isValid: true
          }
        }));
        onChange(field, parsedValue);
      } catch {
        setCustomFieldDrafts(previousDrafts => ({
          ...previousDrafts,
          [field]: {
            value: jsonText,
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
        onChange: event => onChange("creator", event.target.value)
      }), (0, jsxRuntime.jsx)(TextInput, {
        label: "Phiên bản nhân vật",
        value: card.character_version || "",
        onChange: event => onChange("character_version", event.target.value)
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
            onChange: event => {
              onChange("tags", event.target.value.split(",").map(tag => tag.trim()).filter(Boolean));
            },
            className: "w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-slate-200 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition",
            placeholder: "fantasy, sci-fi, isekai"
          })
        })]
      }), (0, jsxRuntime.jsx)(TextArea, {
        containerClassName: "col-span-full",
        label: "Ghi chú của người tạo",
        value: card.creator_notes || "",
        onChange: event => onChange("creator_notes", event.target.value)
      }), (0, jsxRuntime.jsx)(TextArea, {
        containerClassName: "col-span-full",
        label: "Nhận xét của người tạo (V3)",
        value: card.creatorcomment || "",
        onChange: event => onChange("creatorcomment", event.target.value)
      }), customFieldKeys.length > 0 && (0, jsxRuntime.jsxs)("div", {
        className: "col-span-full border-t border-slate-700 pt-4 mt-2",
        children: [(0, jsxRuntime.jsx)("h4", {
          className: "text-sm font-bold text-slate-400 mb-2",
          children: "Trường dữ liệu mở rộng"
        }), (0, jsxRuntime.jsx)("div", {
          className: "grid grid-cols-1 gap-4",
          children: customFieldKeys.map(field => {
            let fieldValue = card[field];
            if (Array.isArray(fieldValue) && fieldValue.every(item => "string" == typeof item)) return (0, jsxRuntime.jsx)(TextArea, {
              label: `${field} (Mỗi mục phân tách bằng '---')`,
              value: fieldValue.join("\n---\n"),
              onChange: event => onChange(field, event.target.value.split("\n---\n").map(item => item.trim())),
              rows: 5
            }, field);
            if ("string" == typeof fieldValue) return (0, jsxRuntime.jsx)(TextArea, {
              label: field,
              value: fieldValue,
              onChange: event => onChange(field, event.target.value)
            }, field);
            if ("boolean" == typeof fieldValue) return (0, jsxRuntime.jsx)("div", {
              children: (0, jsxRuntime.jsx)(ToggleSwitch, {
                label: field,
                checked: fieldValue,
                onChange: value => onChange(field, value)
              })
            }, field);
            if ("number" == typeof fieldValue) return (0, jsxRuntime.jsx)(TextInput, {
              label: field,
              type: "number",
              value: String(fieldValue),
              onChange: event => onChange(field, parseFloat(event.target.value) || 0)
            }, field);
            if ("object" == typeof fieldValue && fieldValue) {
              let draft = customFieldDrafts[field] || {
                value: "",
                isValid: true
              };
              return (0, jsxRuntime.jsxs)("div", {
                children: [(0, jsxRuntime.jsx)(TextArea, {
                  label: `JSON: ${field}`,
                  value: draft.value,
                  onChange: event => handleCustomFieldChange(field, event.target.value),
                  rows: 8,
                  className: "font-mono text-xs " + (draft.isValid ? "" : "border-red-500")
                }), !draft.isValid && (0, jsxRuntime.jsx)("p", {
                  className: "text-sm text-red-400 mt-1",
                  children: "JSON không hợp lệ."
                })]
              }, field);
            }
            return null;
          })
        })]
      })]
    });
  };
}
