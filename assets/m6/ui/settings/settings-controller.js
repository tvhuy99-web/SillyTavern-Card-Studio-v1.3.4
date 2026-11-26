import { requireNativePromiseBridge, awaitNativeDeadline } from '../../../recovered/platform/android/native-bridge.js';
import { awaitAbortable } from '../../../m4/core/async/cancellation.js';
import { safeProbeError } from './model-test-button.js';
const AI_STUDIO_STATUS_KEY = 'sts_aistudio_model_last_status_v2';
function readAiStudioStatus() {
  try {
    const value = JSON.parse(globalThis.sessionStorage?.getItem(AI_STUDIO_STATUS_KEY) || 'null');
    return ['success','error'].includes(value?.kind) && typeof value.message === 'string' ? value : null;
  } catch { return null; }
}
function persistAiStudioStatus(value) {
  try {
    if (value) globalThis.sessionStorage?.setItem(AI_STUDIO_STATUS_KEY, JSON.stringify(value));
    else globalThis.sessionStorage?.removeItem(AI_STUDIO_STATUS_KEY);
  } catch { /* optional diagnostic state */ }
}
// Owns the connection draft and its lifecycle. The host supplies existing
// repositories and the React instance until the legacy UI migration is complete.
export function useConnectionSettings({
  react, useToast, useGeminiModels, defaultGeminiModels,
  readSettings, saveSettings, readGemini, readOpenRouterKey, readOpenRouterModels,
  readProxyUrl, readProxyPassword, readLegacyMode, readProxyForTools,
  readProfiles, saveProfiles, fetchOpenRouterModels, saveOpenRouterModels,
  proxyPersistence, createAiStudioCatalog,
  connections, proxyUrlKey, proxyLegacyKey, proxyForToolsKey, catalog,
  settingsRepository,
}) {
  const { useState, useEffect, useMemo, useRef } = react;
  const { showToast } = useToast();
  const readSettingRaw = key => (settingsRepository ? settingsRepository.getRaw(key) : localStorage.getItem(key));
  const writeSettingRaw = (key, value) => {
    if (settingsRepository) settingsRepository.setRaw(key, String(value));
    else localStorage.setItem(key, String(value));
  };
  const [settings, setSettings] = useState(readSettings());
  const [aiStudioModels, setAiStudioModels] = useState(() => createAiStudioCatalog().read());
  const [aiStudioLoading, setAiStudioLoading] = useState(false);
  const [useDefaultGeminiKey, setUseDefaultGeminiKey] = useState(true);
  const [geminiKeysText, setGeminiKeysText] = useState('');
  const [openRouterKey, setOpenRouterKey] = useState('');
  const [openRouterModels, setOpenRouterModels] = useState([]);
  const [openRouterLoading, setOpenRouterLoading] = useState(false);
  const [openRouterError, setOpenRouterError] = useState(null);
  const [freeOnly, setFreeOnly] = useState(false);
  const [proxyUrl, setProxyUrl] = useState('');
  const [proxyPassword, setProxyPassword] = useState('');
  const [legacyMode, setLegacyMode] = useState(true);
  const [proxyForTools, setProxyForTools] = useState(false);
  const [pingLoading, setPingLoading] = useState(false);
  const [pingStatus, setPingStatus] = useState('idle');
  const [pingError, setPingError] = useState('');
  const [proxyModels, setProxyModels] = useState([]);
  const [proxyLoading, setProxyLoading] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [profileId, setProfileId] = useState('');
  const [rememberProxySecrets, setRememberProxySecrets] = useState(() => proxyPersistence.getRememberSecrets());
  const profileFileRef = useRef(null);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [keyChecking, setKeyChecking] = useState(false);
  const [keyStatus, setKeyStatus] = useState('idle');
  const { models: geminiModels, isLoading: geminiLoading, refetch: refreshGeminiModels } = useGeminiModels(defaultGeminiModels);
  const proxyCatalogRevision = useRef(0);
  const openRouterRevision = useRef(0);
  const pingController = useRef(null);
  const aiStudioCatalog = useRef(null);
  if (!aiStudioCatalog.current) aiStudioCatalog.current = createAiStudioCatalog();
  const aiStudioRequest = useRef(null);
  const [aiStudioStatus, setAiStudioStatus] = useState(readAiStudioStatus);
  function settleAiStudioStatus(value) { persistAiStudioStatus(value); setAiStudioStatus(value); }
  const [aiStudioVisible, setAiStudioVisible] = useState(() => readSettingRaw('sts_aistudio_show_page') === 'true');
  const [aiStudioVisibilityBusy, setAiStudioVisibilityBusy] = useState(false);
  const mounted = useRef(true);
  const visibilityRevision = useRef(0);

  function recordAiStudio(stage, details, level = 'state') {
    try { window.__STS_AI_STUDIO_LOGS__?.record?.(stage, details, level); } catch { /* diagnostics must not interrupt model discovery */ }
  }
  useEffect(() => {
    mounted.current = true;
    const onVisibility = event => { visibilityRevision.current++; setAiStudioVisible(event.detail?.visible === true); };
    const onLog = event => {
      if (!aiStudioRequest.current || event.detail?.source !== 'aistudio') return;
      if (String(event.detail.message).includes('[MODEL_SCAN]')) {
        const p = event.detail.payload || {};
        setAiStudioStatus({ kind: 'working', message: 'AI Studio đang quét model...', detail: `Lần quét: ${p.attempt ?? '?'}; model: ${p.usableModels ?? '?'}; DOM: ${p.domCandidates ?? '?'}; phản hồi mạng: ${p.networkHits ?? '?'}` });
      }
    };
    window.addEventListener?.('sts:aistudio-visibility', onVisibility);
    window.addEventListener?.('sillytavern:system-log', onLog);
    return () => {
      mounted.current = false;
      proxyCatalogRevision.current++;
      openRouterRevision.current++;
      pingController.current?.abort();
      aiStudioRequest.current = null;
      window.removeEventListener?.('sts:aistudio-visibility', onVisibility);
      window.removeEventListener?.('sillytavern:system-log', onLog);
    };
  }, []);

  async function loadAiStudioModels() {
    if (aiStudioRequest.current) return;
    const request = {};
    aiStudioRequest.current = request;
    setAiStudioLoading(true);
    setAiStudioStatus({kind:'working', message:'Đang mở AI Studio và đọc danh sách model...', detail:'Đang chờ phản hồi WebView.'});
    recordAiStudio('MODEL_BUTTON_CLICK', {message:'Pressed AI Studio model catalog download button'});
    const isCurrent = () => mounted.current && aiStudioRequest.current === request;
    try {
      const { models, response } = await aiStudioCatalog.current.load();
      if (!isCurrent()) return;
      setAiStudioModels(models);
      settleAiStudioStatus({kind:'success',message:`Đã tải ${models.length} model từ AI Studio.`,detail:`Quét ${response?.scanCount ?? '?'} lần; phản hồi mạng có Model ID: ${response?.networkHits ?? '?'}.`});
      recordAiStudio('MODEL_BUTTON_SUCCESS', {message:'Model catalog cached', count:models.length});
      showToast(`Đã tải ${models.length} model từ AI Studio.`, 'success');
    } catch (error) {
      if (!isCurrent()) return;
      const message = String(error?.message || error).replace(/AIza[\w-]{15,}|Bearer\s+\S+|(?:access_token|api_key|authorization|cookie)=\S+/gi,'[REDACTED]').slice(0,400);
      settleAiStudioStatus({kind:'error',message:'Không tải được danh sách model.',detail:message+'\nVào Nhật ký hệ thống → AI Studio để xem MODEL_SCAN và MODEL_LOAD_FAILED.'});
      recordAiStudio('MODEL_BUTTON_FAILED', {message}, 'error');
      showToast('Tải danh sách Model: '+message, 'error');
    } finally {
      if (isCurrent()) { aiStudioRequest.current = null; setAiStudioLoading(false); }
    }
  }
  function clearAiStudioModels() {
    if (aiStudioRequest.current) return;
    aiStudioCatalog.current.clear();
    setAiStudioModels([]);
    settleAiStudioStatus(null);
    showToast('Đã xóa danh sách model đã lưu.', 'info');
  }
  async function changeAiStudioVisibility(visible) {
    if (aiStudioVisibilityBusy) return;
    const revision = ++visibilityRevision.current;
    setAiStudioVisibilityBusy(true);
    try {
      const cap = requireNativePromiseBridge(window);
      await awaitNativeDeadline(() => cap.nativePromise('AIStudioText', 'setVisibility', {visible}), {timeoutMs:15000});
      if (!mounted.current || visibilityRevision.current !== revision) return;
      writeSettingRaw('sts_aistudio_show_page', String(visible));
      setAiStudioVisible(visible);
    } catch (error) {
      if (mounted.current && visibilityRevision.current === revision) showToast('Không đổi được hiển thị AI Studio: '+String(error?.message || error), 'error');
    } finally { if (mounted.current) setAiStudioVisibilityBusy(false); }
  }

  async function pingProxy() {
    if (!proxyUrl.trim() || pingController.current) return;
    const controller = new AbortController();
    pingController.current = controller;
    setPingLoading(true); setPingStatus('idle'); setPingError('');
    let timedOut = false;
    const timeout = setTimeout(() => { timedOut = true; controller.abort(); }, 5000);
    const current = () => mounted.current && pingController.current === controller;
    try {
      await awaitAbortable(() => catalog.probeProxy({...profileDraft(),signal:controller.signal}),controller.signal);
      if (current()) setPingStatus('success');
    } catch (error) {
      if (current()) { setPingError(timedOut ? 'Timeout.' : safeProbeError(error, {proxy:{password:proxyPassword}})); setPingStatus('error'); }
    } finally {
      clearTimeout(timeout);
      if (current()) { pingController.current=null; setPingLoading(false); }
    }
  }

  function invalidateProxyCatalog() {
    proxyCatalogRevision.current += 1;
    setProxyLoading(false);
    setProxyModels([]);
    pingController.current?.abort(); pingController.current = null;
    setPingLoading(false); setPingStatus('idle'); setPingError('');
  }

  useEffect(() => {
    const gemini = readGemini();
    setUseDefaultGeminiKey(gemini.useDefault);
    setGeminiKeysText(gemini.keys.join('\n'));
    setOpenRouterKey(readOpenRouterKey());
    setOpenRouterModels(readOpenRouterModels());
    const saved = readSettings(), installedProfiles = readProfiles();
    const selected = installedProfiles.find(profile => profile.id === saved.proxy_profile_id);
    setProfiles(installedProfiles);
    setProfileId(saved.proxy_profile_id || '');
    if (saved.proxy_profile_id) {
      // A missing profile is not permission to display or send global credentials.
      setProxyUrl(selected?.url || '');
      setProxyPassword(selected?.password || '');
      setLegacyMode(selected?.legacyMode ?? false);
      setProxyForTools(selected?.proxyForTools ?? false);
      setProxyModels(selected ? catalog.readProxyTarget(selected) : []);
      setSettings(selected ? {...saved, proxy_protocol: selected.protocol, proxy_model: selected.chatModel, proxy_tool_model: selected.toolModel} : saved);
    } else {
      setProxyUrl(readProxyUrl());
      setProxyPassword(readProxyPassword());
      setLegacyMode(readLegacyMode());
      setProxyForTools(readProxyForTools());
      setProxyModels(catalog.readProxyTarget({url:readProxyUrl(),password:readProxyPassword(),legacyMode:readLegacyMode(),protocol:readSettings().proxy_protocol}));
      setSettings(saved);
    }
  }, []);

  function updateSetting(field, value) {
    if (field === 'proxy_protocol' || field === 'source') invalidateProxyCatalog();
    if (field === 'proxy_protocol' && value !== settings.proxy_protocol) setProxyPassword('');
    setSettings(previous => ({ ...previous, [field]: value }));
    // AI Studio has historically applied these fields immediately.
    if (/^aistudio_(model|tool_model|thinking|tool_thinking)$/.test(field)) {
      saveSettings({ ...readSettings(), [field]: value });
      window.__STS_AI_STUDIO_LOGS__?.record?.('SETTING_SAVED', {
        field, value, source: readSettings().source, message: 'AI Studio setting saved immediately',
      });
    }
  }

  async function loadOpenRouterModels() {
    const revision = ++openRouterRevision.current;
    const current = () => mounted.current && revision === openRouterRevision.current;
    setOpenRouterLoading(true);
    setOpenRouterError(null);
    try {
      const models = await fetchOpenRouterModels();
      if (!current()) return;
      saveOpenRouterModels(models);
      setOpenRouterModels(models);
    } catch (error) {
      if (current()) setOpenRouterError(error instanceof Error ? error.message : 'Error loading models');
    } finally {
      if (current()) setOpenRouterLoading(false);
    }
  }

  const filteredOpenRouterModels = useMemo(() => freeOnly
    ? openRouterModels.filter(model => model.pricing.prompt === '0' && model.pricing.completion === '0')
    : openRouterModels, [openRouterModels, freeOnly]);

  function profileDraft() {
    return { id: profileId, url: proxyUrl, password: proxyPassword, legacyMode, proxyForTools,
      protocol: settings.proxy_protocol, chatModel: settings.proxy_model, toolModel: settings.proxy_tool_model };
  }

  // Profile selection and manual refresh share one model-catalog path. Capture
  // the entire target before awaiting, including the protocol and credentials.
  async function refreshProxyCatalog(target, automatic = false) {
    if (!target.url) {
      if (!automatic) showToast('Vui lòng nhập Proxy URL.', 'warning');
      return;
    }
    const revision = ++proxyCatalogRevision.current;
    setProxyLoading(true);
    try {
      const models = await catalog.refreshProxyTarget(target, {isCurrent: () => revision === proxyCatalogRevision.current});
      if (models === null || revision !== proxyCatalogRevision.current) return;
      const cached = catalog.readProxyTarget(target);
      setProxyModels(cached.length ? cached : models);
      if (!automatic) {
        if (!models.length) showToast('Proxy không cung cấp danh sách model (404). Vui lòng gõ tên Model bằng tay vào ô cấu hình.', 'warning');
        else showToast(`Đã tải ${models.length} models từ Proxy.`, 'success');
      }
    } catch (error) {
      if (revision !== proxyCatalogRevision.current) return;
      if (automatic) {
        console.error('Auto-fetch error:', safeProbeError(error, {proxy:target}));
        showToast(`Không thể tự động tải danh sách model: ${safeProbeError(error, {proxy:target})}`, 'warning');
        const cached = catalog.readProxyTarget(target);
        if (cached.length) setProxyModels(cached);
      } else {
        console.error(safeProbeError(error, {proxy:target}));
        showToast(`Lỗi tải models: ${safeProbeError(error, {proxy:target})}`, 'error');
      }
    } finally {
      if (revision === proxyCatalogRevision.current) setProxyLoading(false);
    }
  }

  function loadProxyModels() { return refreshProxyCatalog(profileDraft()); }

  async function selectProfile(id) {
    invalidateProxyCatalog();
    setProfileId(id);
    if (!id) {
      setProxyUrl(readProxyUrl()); setProxyPassword(readProxyPassword());
      setLegacyMode(readLegacyMode()); setProxyForTools(readProxyForTools());
      setProxyModels(catalog.readProxyTarget({url:readProxyUrl(),password:readProxyPassword(),legacyMode:readLegacyMode(),protocol:readSettings().proxy_protocol}));
      const saved = readSettings();
      setSettings(previous => ({ ...previous, proxy_profile_id: '', proxy_protocol: saved.proxy_protocol, proxy_model: saved.proxy_model, proxy_tool_model: saved.proxy_tool_model }));
      return;
    }
    const profile = profiles.find(item => item.id === id);
    if (!profile) { setProxyUrl(''); setProxyPassword(''); setSettings(previous => ({...previous, proxy_profile_id:id})); return; }
    setProxyUrl(profile.url);
    setProxyPassword(profile.password);
    setLegacyMode(profile.legacyMode);
    setProxyForTools(profile.proxyForTools);
    setSettings(previous => ({ ...previous, proxy_protocol: profile.protocol,
      proxy_model: profile.chatModel, proxy_tool_model: profile.toolModel, proxy_profile_id: id }));
    showToast(`Đã tải cấu hình: ${profile.name}`, 'info');
    if (profile.url) await refreshProxyCatalog(profile, true);
  }

  function createProfile() {
    const name = prompt('Nhập tên cho cấu hình mới:', 'My Proxy Server');
    if (!name) return;
    const profile = { ...profileDraft(), id: `profile_${Date.now()}`, name };
    const next = [...profiles, profile];
    try { saveProfiles(next); } catch { showToast('Không thể tạo Profile.', 'error'); return; }
    setProfiles(next);
    setProfileId(profile.id);
    setSettings(previous => ({ ...previous, proxy_profile_id: profile.id }));
    showToast(`Đã tạo cấu hình mới: ${name}`, 'success');
  }

  const proxyModelOptions = proxyModels.length ? proxyModels : [...geminiModels,
    { id: 'claude-opus-4.5', name: 'Claude Opus 4.5' },
    { id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet' },
    { id: 'gpt-4o', name: 'GPT-4o' },
  ];

  function applySettings() {
    try {
      if (profileId && !profiles.some(profile => profile.id === profileId)) throw Error('Cấu hình Proxy không còn tồn tại.');
      saveSettings(settings);
      connections.saveGemini({ useDefault: useDefaultGeminiKey,
        keys: geminiKeysText.split('\n').map(key => key.trim()).filter(Boolean) });
      connections.saveOpenRouterKey(openRouterKey);
      if (!profileId) {
        writeSettingRaw(proxyUrlKey, proxyUrl.trim().replace(/\/$/, ''));
        proxyPersistence.setPassword(proxyPassword.trim());
        writeSettingRaw(proxyLegacyKey, String(legacyMode));
        writeSettingRaw(proxyForToolsKey, String(proxyForTools));
      }
      const models = [];
      for (const id of [settings.proxy_model, settings.proxy_tool_model]) {
        if (id && !models.some(model => model.id === id)) models.push({ id, name: id });
      }
      catalog.mergeProxyTarget(profileDraft(), models);
      saveOpenRouterModels(openRouterModels);
      if (profileId) {
        const next = profiles.map(profile => profile.id === profileId ? { ...profile, ...profileDraft() } : profile);
        saveProfiles(next);
        setProfiles(next);
      }
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }

  return {
    showToast, settings, setSettings, useDefaultGeminiKey, setUseDefaultGeminiKey,
    geminiKeysText, setGeminiKeysText, openRouterKey, setOpenRouterKey, openRouterModels,
    openRouterLoading, openRouterError, freeOnly, setFreeOnly, proxyUrl, setProxyUrl,
    proxyPassword, setProxyPassword, legacyMode, setLegacyMode, proxyForTools, setProxyForTools,
    pingLoading, setPingLoading, pingStatus, setPingStatus, pingError, setPingError,
    proxyLoading, setProxyModels, profiles, setProfiles, profileId, setProfileId, profileFileRef,
    saveStatus, keyChecking, setKeyChecking, keyStatus, setKeyStatus, geminiModels, geminiLoading,
    refreshGeminiModels, updateSetting, loadOpenRouterModels, filteredOpenRouterModels, selectProfile,
    createProfile, proxyModelOptions, aiStudioModels, setAiStudioModels, aiStudioLoading,
    setAiStudioLoading, rememberProxySecrets, setRememberProxySecrets, loadProxyModels, applySettings,
    clearProxyCatalog: () => { catalog.clearProxyTarget(profileDraft()); invalidateProxyCatalog(); },
    invalidateProxyCatalog, pingProxy, loadAiStudioModels, clearAiStudioModels, aiStudioStatus, aiStudioVisible, aiStudioVisibilityBusy, changeAiStudioVisibility,
  };
}
