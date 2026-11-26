// Factories receive the existing React/runtime bindings lazily via getDependencies().
// Mechanically extracted for F02.07 while preserving original component logic and contracts.

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
    } = getDependencies();
    let [rawExtensionsJson, setRawExtensionsJson] = (0, react.useState)("{}");
    let [isValidJson, setIsValidJson] = (0, react.useState)(true);
    let otherExtensions = (0, react.useMemo)(() => {
      let extensions = {
        ...(card.extensions || {})
      };
      delete extensions.regex_scripts;
      delete extensions.TavernHelper_scripts;
      return extensions;
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
          onChange: event => {
            let jsonText = event.target.value;
            setRawExtensionsJson(jsonText);
            try {
              let parsedExtensions = "" === jsonText.trim() ? {} : JSON.parse(jsonText);
              if (!parsedExtensions || "object" != typeof parsedExtensions || Array.isArray(parsedExtensions)) throw Error("Extensions phải là một đối tượng JSON.");
              onExtensionsReplace(parsedExtensions);
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
    } = getDependencies();
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
        onExtensionsReplace: nextExtensions => {
          let preservedScripts = {};
          card.extensions?.regex_scripts && (preservedScripts.regex_scripts = card.extensions.regex_scripts);
          card.extensions?.TavernHelper_scripts && (preservedScripts.TavernHelper_scripts = card.extensions.TavernHelper_scripts);
          onUpdate({
            ...card,
            extensions: {
              ...nextExtensions,
              ...preservedScripts
            }
          });
        }
      })]
    });
  };
}
