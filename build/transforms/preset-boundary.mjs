const NORMALIZER_IMPORT = "import { normalizePresetConfig as __stsNormalizePresetConfig, normalizePresetList as __stsNormalizePresetList } from './prompt-normalizer-v1.3.6.js?v=1.3.6-worldinfo-1';\n";

function replaceExactlyOnce(source, oldText, newText, label) {
  const first = source.indexOf(oldText);
  if (first < 0) throw new Error(`[preset boundary] ${label}: pattern not found`);
  const second = source.indexOf(oldText, first + oldText.length);
  if (second >= 0) throw new Error(`[preset boundary] ${label}: pattern matched more than once`);
  return source.slice(0, first) + newText + source.slice(first + oldText.length);
}

const REPLACEMENTS = Object.freeze([
  {
    label: 'normalize preset IndexedDB read/write boundaries',
    oldText: 'tn=async()=>{let e=await zt();return new Promise((t,n)=>{let r=e.transaction(Ut,"readonly").objectStore(Ut).getAll();r.onerror=()=>n("Không thể lấy presets từ cơ sở dữ liệu."),r.onsuccess=()=>t(r.result)})},nn=async e=>qt(Ut,t=>{t.put(e)},\`Không thể lưu preset "\${e.name}".\`)',
    newText: 'tn=async()=>{let e=await zt();return new Promise((t,n)=>{let r=e.transaction(Ut,"readonly").objectStore(Ut).getAll();r.onerror=()=>n("Không thể lấy presets từ cơ sở dữ liệu."),r.onsuccess=()=>t(__stsNormalizePresetList(r.result))})},nn=async e=>{let n=__stsNormalizePresetConfig(e);return qt(Ut,t=>{t.put(n)},\`Không thể lưu preset "\${n.name}".\`)}',
  },
  {
    label: 'normalize imported preset before store insertion',
    oldText: 'enabled:"boolean"==typeof e.enabled&&e.enabled,injection_order:e.injection_order??void 0}).filter(Boolean)}return r},bu=At()',
    newText: 'enabled:"boolean"==typeof e.enabled&&e.enabled,injection_order:e.injection_order??void 0}).filter(Boolean)}return __stsNormalizePresetConfig(r)},bu=At()',
  },
  {
    label: 'normalize updated preset before persistence and in-memory replacement',
    oldText: 'updateActivePreset:async t=>{try{await nn(t),e(e=>{let n=e.presets.findIndex(e=>e.name===t.name);-1!==n&&(e.presets[n]=t)})}catch{e(e=>{e.error="Failed to update preset"})}}',
    newText: 'updateActivePreset:async t=>{try{let n=__stsNormalizePresetConfig(t);await nn(n),e(e=>{let r=e.presets.findIndex(e=>e.name===n.name);-1!==r&&(e.presets[r]=n)})}catch{e(e=>{e.error="Failed to update preset"})}}',
  },
]);

export function applyPresetBoundaryTransform(source) {
  let code = source;
  for (const replacement of REPLACEMENTS) {
    code = replaceExactlyOnce(code, replacement.oldText, replacement.newText, replacement.label);
  }

  if (!code.startsWith(NORMALIZER_IMPORT)) {
    code = NORMALIZER_IMPORT + code;
  }

  return code;
}

export const PRESET_BOUNDARY_PATCH_COUNT = REPLACEMENTS.length;
