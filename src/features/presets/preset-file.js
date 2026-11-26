// Recovered from the application host. One owner; dependency getters preserve late binding.
export function createPresetFileCodec(dependencies = {}) {
var parsePresetFile = async file => {
  if (!file.size) throw Error(`Không thể đọc preset "${file.name}": tệp trống.`);
  if (file.size > 5e7) throw Error(`Không thể đọc preset "${file.name}": tệp vượt quá giới hạn 50 MB.`);
  let rawPreset;
  if (!file.name.toLowerCase().endsWith(".json")) console.warn("Preset parser: File does not end with .json, attempting to parse anyway.");
  try {
    rawPreset = JSON.parse((await file.text()).replace(/^\uFEFF/,""));
  } catch (error) {
    throw Error(`Không thể đọc preset "${file.name}": JSON không hợp lệ.`, {cause: error});
  }
  if ("object" != typeof rawPreset || !rawPreset || Array.isArray(rawPreset)) throw Error(`Không thể đọc preset "${file.name}": dữ liệu gốc phải là một đối tượng JSON.`);
  if (void 0 !== rawPreset.temperature && void 0 === rawPreset.temp) rawPreset.temp = rawPreset.temperature;
  if (void 0 !== rawPreset.openai_max_tokens && void 0 === rawPreset.max_tokens) rawPreset.max_tokens = rawPreset.openai_max_tokens;
  if (void 0 !== rawPreset.openai_max_context && void 0 === rawPreset.truncation_length) rawPreset.truncation_length = rawPreset.openai_max_context;
  let presetName = "string" == typeof rawPreset.name ? rawPreset.name.trim().slice(0,300) : "";
  let preset = {...dependencies.builtInPreset, ...rawPreset};
  preset.name = presetName || file.name.replace(/\.json$/i,"").slice(0,300);
  if (preset.prompts && !Array.isArray(preset.prompts)) preset.prompts = [];
  else if (preset.prompts) {
    if (preset.prompts.length > 1e4) throw Error(`Không thể đọc preset "${file.name}": có quá nhiều prompt.`);
    preset.prompts = preset.prompts.map(prompt => "object" != typeof prompt || !prompt || Array.isArray(prompt) ? null : {
      ...prompt,
      name: null == prompt.name ? void 0 : String(prompt.name).slice(0,500),
      identifier: null == prompt.identifier ? void 0 : String(prompt.identifier).slice(0,500),
      content: null == prompt.content ? "" : String(prompt.content).slice(0,5e6),
      enabled: "boolean" == typeof prompt.enabled && prompt.enabled,
      injection_order: prompt.injection_order ?? void 0
    }).filter(Boolean);
  }
  return (0, dependencies.__stsNormalizePresetConfig)(preset);
};
return { parsePresetFile };
}
