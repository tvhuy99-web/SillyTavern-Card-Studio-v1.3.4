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
    } = getDependencies();
    return (0, jsxRuntime.jsxs)(CollapsibleSection, {
      title: "Thông tin cơ bản",
      description: "Tên, nhận xét và lời nhắc hệ thống chung.",
      children: [(0, jsxRuntime.jsx)(TextInput, {
        label: "Tên Preset",
        value: preset.name || "",
        onChange: event => onChange("name", event.target.value)
      }), (0, jsxRuntime.jsx)(TextInput, {
        label: "Nhận xét",
        value: preset.comment || "",
        onChange: event => onChange("comment", event.target.value)
      }), (0, jsxRuntime.jsx)(TextArea, {
        label: "Lời nhắc Hệ thống",
        value: preset.system_prompt || "",
        onChange: event => onChange("system_prompt", event.target.value),
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
    } = getDependencies();
    return (0, jsxRuntime.jsxs)(jsxRuntime.Fragment, {
      children: [(0, jsxRuntime.jsxs)(CollapsibleSection, {
        title: "Sampling Cốt lõi",
        description: "Kiểm soát sự sáng tạo và tính mạch lạc.",
        children: [(0, jsxRuntime.jsx)(NumberInput, {
          label: "Nhiệt độ (Temperature)",
          value: preset.temp ?? 1,
          onChange: value => onChange("temp", value),
          min: 0,
          max: 2,
          step: .01,
          tooltip: "Độ ngẫu nhiên. Cao = Sáng tạo, Thấp = Chính xác."
        }), (0, jsxRuntime.jsx)(NumberInput, {
          label: "Top P",
          value: preset.top_p ?? .9,
          onChange: value => onChange("top_p", value),
          min: 0,
          max: 1,
          step: .01,
          tooltip: "Nucleus Sampling. Giới hạn tập hợp từ vựng."
        }), (0, jsxRuntime.jsx)(NumberInput, {
          label: "Top K",
          value: preset.top_k ?? 0,
          onChange: value => onChange("top_k", value),
          min: 0,
          max: 100,
          step: 1,
          tooltip: "0 = Tự động (không gửi topK). Giá trị từ 1 trở lên mới được gửi cho nhà cung cấp mô hình."
        }), (0, jsxRuntime.jsx)(NumberInput, {
          label: "Typical P",
          value: preset.typical_p ?? 1,
          onChange: value => onChange("typical_p", value),
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
          onChange: value => onChange("min_p", value),
          min: 0,
          max: 1,
          step: .01,
          tooltip: "Ngưỡng xác suất tối thiểu."
        }), (0, jsxRuntime.jsx)(NumberInput, {
          label: "Repetition Penalty",
          value: preset.repetition_penalty ?? 1.1,
          onChange: value => onChange("repetition_penalty", value),
          min: 1,
          max: 2,
          step: .01,
          tooltip: "Phạt lặp lại từ."
        }), (0, jsxRuntime.jsx)(NumberInput, {
          label: "Frequency Penalty",
          value: preset.frequency_penalty ?? 0,
          onChange: value => onChange("frequency_penalty", value),
          min: 0,
          max: 2,
          step: .01
        }), (0, jsxRuntime.jsx)(NumberInput, {
          label: "Presence Penalty",
          value: preset.presence_penalty ?? 0,
          onChange: value => onChange("presence_penalty", value),
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
          onChange: event => onChange("mirostat_mode", parseInt(event.target.value, 10)),
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
          onChange: value => onChange("mirostat_tau", value),
          min: 0,
          max: 10,
          step: .1
        }), (0, jsxRuntime.jsx)(NumberInput, {
          label: "Mirostat ETA",
          value: preset.mirostat_eta ?? .1,
          onChange: value => onChange("mirostat_eta", value),
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
    } = getDependencies();
    return (0, jsxRuntime.jsxs)(jsxRuntime.Fragment, {
      children: [(0, jsxRuntime.jsxs)(CollapsibleSection, {
        title: "Kiểm soát Tạo văn bản",
        defaultOpen: false,
        description: "Độ dài, token và điều kiện dừng.",
        children: [(0, jsxRuntime.jsx)(TextInput, {
          label: "Max Tokens",
          value: preset.max_tokens ?? 2048,
          onChange: event => onChange("max_tokens", event.target.value),
          type: "text"
        }), (0, jsxRuntime.jsx)(TextInput, {
          label: "Độ dài cắt bỏ (Context Limit)",
          value: preset.truncation_length ?? 4096,
          onChange: event => onChange("truncation_length", event.target.value),
          type: "text"
        }), (0, jsxRuntime.jsxs)("div", {
          className: "space-y-4",
          children: [(0, jsxRuntime.jsx)(ToggleSwitch, {
            label: "Ban EOS Token",
            checked: preset.ban_eos_token ?? false,
            onChange: value => onChange("ban_eos_token", value)
          }), (0, jsxRuntime.jsx)(ToggleSwitch, {
            label: "Stream Response",
            checked: preset.stream_response ?? false,
            onChange: value => onChange("stream_response", value),
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
          onChange: value => onChange("stopping_strings", value)
        }), (0, jsxRuntime.jsx)(StringListInput, {
          label: "Custom Stopping Strings",
          values: preset.custom_stopping_strings ?? [],
          onChange: value => onChange("custom_stopping_strings", value)
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
    } = getDependencies();
    return (0, jsxRuntime.jsxs)(CollapsibleSection, {
      title: "Chế độ Instruct & Định dạng",
      defaultOpen: false,
      description: "Cấu hình khuôn mẫu cho lời nhắc.",
      children: [(0, jsxRuntime.jsx)(TextInput, {
        label: "WI Format",
        value: preset.wi_format || "",
        onChange: event => onChange("wi_format", event.target.value),
        tooltip: "Mẫu chèn World Info: {{keys}} {{content}}"
      }), (0, jsxRuntime.jsx)(TextInput, {
        label: "Scenario Format",
        value: preset.scenario_format || "",
        onChange: event => onChange("scenario_format", event.target.value)
      }), (0, jsxRuntime.jsx)(TextInput, {
        label: "Personality Format",
        value: preset.personality_format || "",
        onChange: event => onChange("personality_format", event.target.value)
      }), (0, jsxRuntime.jsx)(TextArea, {
        label: "Mẫu Instruct",
        value: preset.instruct_template || "",
        onChange: event => onChange("instruct_template", event.target.value),
        rows: 8,
        containerClassName: "md:col-span-2"
      }), (0, jsxRuntime.jsx)(TextArea, {
        label: "New Chat Prompt",
        value: preset.new_chat_prompt || "",
        onChange: event => onChange("new_chat_prompt", event.target.value),
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
    } = getDependencies();
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
          onChange: value => onChange("thinking_budget", value),
          min: 0,
          max: 32768,
          step: 1024,
          tooltip: "Token dành cho suy nghĩ (Gemini 2.5+)."
        }), (0, jsxRuntime.jsxs)("div", {
          className: "md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4",
          children: [(0, jsxRuntime.jsx)(ToggleSwitch, {
            label: "Wrap in Quotes",
            checked: preset.wrap_in_quotes ?? false,
            onChange: value => onChange("wrap_in_quotes", value)
          }), (0, jsxRuntime.jsx)(ToggleSwitch, {
            label: "Max Context Unlocked",
            checked: preset.max_context_unlocked ?? false,
            onChange: value => onChange("max_context_unlocked", value)
          }), (0, jsxRuntime.jsx)(ToggleSwitch, {
            label: "Squash System Messages",
            checked: preset.squash_system_messages ?? true,
            onChange: value => onChange("squash_system_messages", value)
          }), (0, jsxRuntime.jsx)(ToggleSwitch, {
            label: "Bypass Status Check",
            checked: preset.bypass_status_check ?? true,
            onChange: value => onChange("bypass_status_check", value)
          })]
        })]
      }), (0, jsxRuntime.jsxs)(CollapsibleSection, {
        title: "Phần mở rộng (JSON)",
        defaultOpen: false,
        description: "Dữ liệu cấu hình thô.",
        children: [(0, jsxRuntime.jsx)(TextArea, {
          label: "Extensions JSON",
          value: extensionsJson,
          onChange: event => {
            let jsonText = event.target.value;
            if (setExtensionsJson(jsonText), !jsonText.trim()) return onChange("extensions", {}), void setIsValidJson(true);
            try {
              onChange("extensions", JSON.parse(jsonText));
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
    } = getDependencies();
    let handleFieldChange = (0, react.useCallback)((field, value) => {
      onUpdate({
        ...preset,
        [field]: value
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
