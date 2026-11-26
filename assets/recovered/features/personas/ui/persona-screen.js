// Factories receive the existing React/runtime bindings lazily via getDependencies().
// Mechanically extracted for F02.07 while preserving original component logic and contracts.

export function createPersonaEditor(getDependencies) {
  return function PersonaEditor({
    persona: persona,
    onUpdate: onUpdate
  }) {
    const {
      TextInput,
      TextArea,
      jsxRuntime
    } = getDependencies();
    return (0, jsxRuntime.jsxs)("div", {
      className: "bg-slate-800/50 p-6 rounded-xl space-y-4 h-full flex flex-col",
      children: [(0, jsxRuntime.jsx)("h3", {
        className: "text-xl font-bold text-sky-400",
        children: "Chỉnh sửa Hồ sơ"
      }), (0, jsxRuntime.jsx)(TextInput, {
        label: "Tên Hồ sơ",
        value: persona.name,
        onChange: event => onUpdate({
          ...persona,
          name: event.target.value
        })
      }), (0, jsxRuntime.jsx)("div", {
        className: "flex-grow flex flex-col",
        children: (0, jsxRuntime.jsx)(TextArea, {
          label: "Mô tả",
          value: persona.description,
          onChange: event => onUpdate({
            ...persona,
            description: event.target.value
          }),
          rows: 10,
          containerClassName: "flex-grow flex flex-col",
          className: "flex-grow",
          placeholder: "Mô tả về con người, tính cách, hoặc vai trò bạn muốn nhập vai..."
        })
      })]
    });
  };
}

export function createPersonaScreen(getDependencies) {
  return function PersonaScreen() {
    const {
      personaStore,
      PersonaEditor,
      react,
      LoadingIndicator,
      jsxRuntime,
      ToggleSwitch
    } = getDependencies();
    let {
      personas: personas,
      activePersonaId: activePersonaId,
      isLoading: isLoading,
      error: error,
      addOrUpdatePersona: addOrUpdatePersona,
      deletePersona: deletePersona,
      setActivePersonaId: setActivePersonaId
    } = personaStore();
    let [selectedPersonaId, setSelectedPersonaId] = (0, react.useState)(null);
    let selectedPersona = personas.find(persona => persona.id === selectedPersonaId) || null;
    return isLoading ? (0, jsxRuntime.jsx)(LoadingIndicator, {
      message: "Đang tải hồ sơ..."
    }) : (0, jsxRuntime.jsxs)("div", {
      className: "grid grid-cols-1 md:grid-cols-3 gap-6",
      children: [(0, jsxRuntime.jsxs)("div", {
        className: "md:col-span-1 bg-slate-800/50 p-3 rounded-xl flex flex-col gap-3",
        children: [(0, jsxRuntime.jsxs)("div", {
          className: "flex items-center justify-between",
          children: [(0, jsxRuntime.jsx)("h2", {
            className: "text-lg font-bold text-slate-200",
            children: "Danh sách Hồ sơ"
          }), (0, jsxRuntime.jsx)("button", {
            onClick: () => {
              let newPersona = {
                id: `persona_${Date.now()}`,
                name: "Hồ sơ Mới",
                description: ""
              };
              addOrUpdatePersona(newPersona);
              setSelectedPersonaId(newPersona.id);
            },
            className: "text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-1 rounded font-bold ",
            children: "+ Mới"
          })]
        }), (0, jsxRuntime.jsx)("div", {
          className: "space-y-1 overflow-y-auto max-h-[60vh] custom-scrollbar pr-1",
          children: 0 === personas.length ? (0, jsxRuntime.jsx)("p", {
            className: "text-slate-500 text-sm italic text-center py-4",
            children: "Chưa có hồ sơ nào."
          }) : personas.map(persona => (0, jsxRuntime.jsx)("div", {
            className: "px-3 py-2 rounded-lg  text-sm font-medium " + (selectedPersonaId === persona.id ? "bg-sky-600/30 ring-1 ring-sky-500/50" : "hover:bg-slate-700/50"),
            children: (0, jsxRuntime.jsxs)("div", {
              className: "flex items-center justify-between",
              children: [(0, jsxRuntime.jsx)("button", {
                type: "button",
                className: "truncate flex-grow mr-4 cursor-pointer " + (selectedPersonaId === persona.id ? "text-white" : "text-slate-400 hover:text-slate-200"),
                onClick: () => setSelectedPersonaId(persona.id),
                children: persona.name
              }), (0, jsxRuntime.jsx)("div", {
                className: "flex items-center gap-3 flex-shrink-0",
                children: (0, jsxRuntime.jsx)(ToggleSwitch, {
                  ariaLabel: `Đặt ${persona.name} làm hồ sơ mặc định`,
                  checked: activePersonaId === persona.id,
                  onChange: () => (personaId => {
                    setActivePersonaId(activePersonaId === personaId ? null : personaId);
                  })(persona.id),
                  clean: true
                })
              })]
            })
          }, persona.id))
        }), (0, jsxRuntime.jsxs)("div", {
          className: "mt-auto pt-3 border-t border-slate-700/50",
          children: [error && (0, jsxRuntime.jsx)("p", {
            className: "text-red-400 text-xs p-2 bg-red-900/30 rounded mb-2",
            children: error
          }), (0, jsxRuntime.jsx)("button", {
            onClick: () => {
              selectedPersonaId && window.confirm("Bạn có chắc chắn muốn xóa hồ sơ này không?") && (deletePersona(selectedPersonaId), setSelectedPersonaId(null));
            },
            disabled: !selectedPersonaId,
            className: "w-full bg-red-900/30 hover:bg-red-800/50 text-red-300 font-semibold py-1.5 px-3 text-xs rounded-lg disabled:opacity-50 disabled:cursor-not-allowed border border-red-900/50 ",
            children: "Xóa"
          })]
        })]
      }), (0, jsxRuntime.jsx)("div", {
        className: "md:col-span-2",
        children: selectedPersona ? (0, jsxRuntime.jsx)(PersonaEditor, {
          persona: selectedPersona,
          onUpdate: addOrUpdatePersona
        }) : (0, jsxRuntime.jsx)("div", {
          className: "flex items-center justify-center h-full bg-slate-800/30 rounded-xl border-2 border-dashed border-slate-700 min-h-[40vh]",
          children: (0, jsxRuntime.jsx)("div", {
            className: "text-center text-slate-500",
            children: (0, jsxRuntime.jsx)("p", {
              className: "font-semibold",
              children: "Chọn một hồ sơ để chỉnh sửa"
            })
          })
        })
      })]
    });
  };
}
