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
    } = getDependencies();
    let [isExpanded, setIsExpanded] = (0, react.useState)(false);
    let updateField = (field, value) => {
      onUpdate(index, {
        ...script,
        value: {
          ...(script?.value || {}),
          [field]: value
        }
      });
    };
    return (0, jsxRuntime.jsxs)("div", {
      className: "bg-slate-800 rounded-lg border border-slate-700",
      children: [(0, jsxRuntime.jsxs)("div", {
        className: "flex items-center p-3",
        children: [(0, jsxRuntime.jsx)("div", {
          className: "flex items-center gap-2 flex-shrink-0 mr-4",
          onClick: event => event.stopPropagation(),
          children: (0, jsxRuntime.jsx)(ToggleSwitch, {
            label: "",
            ariaLabel: `Bật kịch bản ${script?.value?.name || "Kịch bản không tên"}`,
            checked: script?.value?.enabled ?? false,
            onChange: enabled => updateField("enabled", enabled),
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
            onClick: event => {
              event.stopPropagation();
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
          onChange: event => updateField("name", event.target.value)
        }), (0, jsxRuntime.jsx)("div", {
          className: "relative",
          children: (0, jsxRuntime.jsx)(TextArea, {
            label: "Nội dung",
            value: script?.value?.content || "",
            onChange: event => updateField("content", event.target.value),
            rows: 15,
            className: "font-mono text-xs"
          })
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
    } = getDependencies();
    let handleUpdateScript = (0, react.useCallback)((index, updatedScript) => {
      let nextScripts = [...scripts];
      nextScripts[index] = updatedScript;
      onUpdate(nextScripts);
    }, [scripts, onUpdate]);
    let handleRemoveScript = (0, react.useCallback)(index => {
      onUpdate(scripts.filter((script, scriptIndex) => scriptIndex !== index));
    }, [scripts, onUpdate]);
    let handleAddScript = (0, react.useCallback)(() => {
      let newScript = {
        type: "script",
        value: {
          id: `tavern_${Date.now()}`,
          name: "Kịch bản Mới",
          content: "",
          enabled: true
        }
      };
      onUpdate([...scripts, newScript]);
    }, [scripts, onUpdate]);
    return (0, jsxRuntime.jsxs)("div", {
      className: "space-y-3",
      children: [scripts.map((script, index) => (0, jsxRuntime.jsx)(TavernScriptEditor, {
        script: script,
        index: index,
        onUpdate: handleUpdateScript,
        onRemove: handleRemoveScript
      }, script?.value?.id || index)), (0, jsxRuntime.jsxs)("button", {
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
