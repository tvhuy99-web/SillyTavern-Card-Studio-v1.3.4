import { createChoiceSelect } from '../components/dialog-focus.js';
import { resolveCatalogTarget, refreshDialogProxyCatalog } from '../../providers/common/model-catalog.js';

function resolveSelectedQuickModel(connectionSettings, proxyProfiles) {
  if (connectionSettings.source === 'aistudio') {
    return connectionSettings.aistudio_model || 'gemini-2.5-flash';
  }
  if (connectionSettings.source === 'gemini') {
    return connectionSettings.gemini_model;
  }
  if (connectionSettings.source === 'proxy') {
    return proxyProfiles.find(profile => profile.id === connectionSettings.proxy_profile_id)?.chatModel
      || connectionSettings.proxy_model;
  }
  return connectionSettings.openrouter_model;
}

export function createQuickConnectionDialog(getDependencies) {
  const ChoiceSelect = createChoiceSelect(getDependencies);
  return function QuickConnectionDialog({
    isOpen,
    onClose,
    activePresetName,
    onPresetChange,
    activePersonaId,
    onPersonaChange,
    onConnectionChange,
  }) {
    const {
      personaStore,
      defaultProxyModels,
      ModelTestButton,
      defaultGeminiModels,
      useDialogFocus,
      connections,
      proxyPersistence,
      getProxyLegacyMode,
      react,
      presetStore,
      buildSavedProbeTarget,
      getProxyProfiles,
      catalog,
      useToast,
      useGeminiCatalog,
      Icon,
      getConnectionSettings,
      getOpenRouterCachedModels,
      saveConnectionSettings,
      saveProfiles,
      testModel,
      getProxyUrl,
      jsxRuntime,
      getProxyPassword,
    } = getDependencies();

    const { presets } = presetStore();
    const { personas } = personaStore();
    const { showToast } = useToast();
    const dialogRef = react.useRef(null);
    const closeButtonRef = react.useRef(null);

    const [connectionSettings, setConnectionSettings] = react.useState(getConnectionSettings());
    const [proxyModels, setProxyModels] = react.useState([]);
    const [openRouterModels, setOpenRouterModels] = react.useState([]);
    const [proxyProfiles, setProxyProfiles] = react.useState([]);
    const [isLoadingProxyModels, setIsLoadingProxyModels] = react.useState(false);
    const { models: geminiModels } = useGeminiCatalog(defaultGeminiModels);

    useDialogFocus(isOpen, onClose, dialogRef, closeButtonRef);

    react.useEffect(() => {
      if (isOpen) {
        setConnectionSettings(getConnectionSettings());
        setProxyProfiles(getProxyProfiles());
        setProxyModels([]);
        setOpenRouterModels(getOpenRouterCachedModels());
      }
    }, [isOpen]);

    react.useEffect(() => {
      if (!isOpen || connectionSettings.source !== 'proxy') {
        setIsLoadingProxyModels(false);
        return;
      }
      const controller = new AbortController();
      const isCurrent = () => !controller.signal.aborted;
      setIsLoadingProxyModels(true);
      setProxyModels([]);

      (async () => {
        try {
          const target = resolveCatalogTarget({
            profileId: connectionSettings.proxy_profile_id,
            profiles: getProxyProfiles(),
            global: {
              url: getProxyUrl(),
              password: getProxyPassword(),
              legacyMode: getProxyLegacyMode(),
              protocol: connectionSettings.proxy_protocol,
            },
          });
          await refreshDialogProxyCatalog({
            catalog,
            target,
            signal: controller.signal,
            isCurrent,
            publish: setProxyModels,
          });
        } catch {
          if (isCurrent()) {
            showToast('Không tải được model Proxy. Kiểm tra cấu hình kết nối.', 'error');
          }
        } finally {
          if (isCurrent()) {
            setIsLoadingProxyModels(false);
          }
        }
      })();

      return () => controller.abort();
    }, [connectionSettings.source, connectionSettings.proxy_profile_id, connectionSettings.proxy_protocol, isOpen]);

    react.useEffect(() => {
      const handleOutsideMouseDown = event => {
        if (dialogRef.current && !dialogRef.current.contains(event.target)) {
          onClose();
        }
      };
      if (isOpen) {
        document.addEventListener('mousedown', handleOutsideMouseDown);
      }
      return () => document.removeEventListener('mousedown', handleOutsideMouseDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const modelOptions = connectionSettings.source === 'gemini'
      ? geminiModels
      : (connectionSettings.source === 'openrouter'
          ? openRouterModels.map(model => ({
              id: model.id,
              name: `${model.name} (${model.pricing?.prompt === '0' ? 'Free' : '$'})`,
            }))
          : (proxyModels.length > 0 ? proxyModels : defaultProxyModels));

    const currentModelValue = resolveSelectedQuickModel(connectionSettings, proxyProfiles);

    const handleSourceChange = event => {
      const nextSettings = { ...connectionSettings, source: event.target.value };
      saveConnectionSettings(nextSettings);
      setConnectionSettings(nextSettings);
      onConnectionChange();
    };

    const handleProxyProfileChange = event => {
      const nextSettings = {
        ...connectionSettings,
        proxy_profile_id: event.target.value || undefined,
      };
      saveConnectionSettings(nextSettings);
      setConnectionSettings(nextSettings);
      onConnectionChange();
    };

    const handleModelChange = event => {
      const nextModelId = event.target.value;
      const nextSettings = { ...connectionSettings };
      if (connectionSettings.source === 'aistudio') {
        nextSettings.aistudio_model = nextModelId;
      } else if (connectionSettings.source === 'gemini') {
        nextSettings.gemini_model = nextModelId;
      } else if (connectionSettings.source === 'proxy') {
        nextSettings.proxy_model = nextModelId;
      } else if (connectionSettings.source === 'openrouter') {
        nextSettings.openrouter_model = nextModelId;
      }

      if (connectionSettings.source === 'proxy' && connectionSettings.proxy_profile_id) {
        try {
          const currentProfiles = getProxyProfiles();
          if (!currentProfiles.some(profile => profile.id === connectionSettings.proxy_profile_id)) {
            throw new Error('Profile không tồn tại');
          }
          const updatedProfiles = currentProfiles.map(profile => (
            profile.id === connectionSettings.proxy_profile_id
              ? { ...profile, chatModel: nextModelId }
              : profile
          ));
          saveProfiles(updatedProfiles);
          setProxyProfiles(updatedProfiles);
          onConnectionChange();
        } catch {
          showToast('Không lưu được model Proxy.', 'error');
        }
        return;
      }

      saveConnectionSettings(nextSettings);
      setConnectionSettings(nextSettings);
      onConnectionChange();
    };

    return jsxRuntime.jsxs('div', {
      ref: dialogRef,
      className: 'absolute top-14 left-16 md:left-auto md:right-1/4 w-72 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl z-50  flex flex-col max-h-[70vh]',
      role: 'dialog',
      'aria-modal': true,
      'aria-labelledby': 'quick-settings-title',
      children: [
        jsxRuntime.jsxs('div', {
          className: 'p-3 border-b border-slate-700 bg-slate-900/50 rounded-t-xl shrink-0 flex items-center justify-between gap-2',
          children: [
            jsxRuntime.jsx(Icon, { name: 'settings', className: 'h-4 w-4 text-sky-400' }),
            jsxRuntime.jsx('h3', {
              id: 'quick-settings-title',
              className: 'text-xs font-bold text-slate-300 uppercase tracking-wider',
              children: 'Cấu hình Nhanh',
            }),
            jsxRuntime.jsx('button', {
              ref: closeButtonRef,
              onClick: onClose,
              className: 'text-slate-400 hover:text-white',
              'aria-label': 'Đóng cấu hình nhanh',
              children: '✕',
            }),
          ],
        }),
        jsxRuntime.jsxs('div', {
          className: 'overflow-y-auto custom-scrollbar p-3 space-y-4',
          children: [
            jsxRuntime.jsxs('div', {
              className: 'space-y-2',
              children: [
                jsxRuntime.jsx('label', {
                  className: 'text-[10px] font-bold text-indigo-400 uppercase',
                  children: 'Nguồn & Model (Brain)',
                }),
                jsxRuntime.jsxs('div', {
                  className: 'flex items-center gap-2',
                  children: [
                    jsxRuntime.jsx('span', { className: 'text-xs text-slate-400 w-12 shrink-0', children: 'Nguồn:' }),
                    jsxRuntime.jsxs(ChoiceSelect, {
                      value: connectionSettings.source,
                      'aria-label': 'Nguồn mô hình',
                      onChange: handleSourceChange,
                      className: 'flex-grow bg-slate-900 border border-slate-600 rounded text-xs p-1.5 text-white focus:border-indigo-500 outline-none',
                      children: [
                        jsxRuntime.jsx('option', { value: 'gemini', children: 'Google Gemini' }),
                        jsxRuntime.jsx('option', { value: 'openrouter', children: 'OpenRouter' }),
                        jsxRuntime.jsx('option', { value: 'proxy', children: 'Proxy' }),
                        jsxRuntime.jsx('option', { value: 'aistudio', children: 'Google / AI Studio' }),
                      ],
                    }),
                  ],
                }),
                connectionSettings.source === 'proxy' && jsxRuntime.jsxs('div', {
                  className: 'flex items-center gap-2 ',
                  children: [
                    jsxRuntime.jsx('span', { className: 'text-xs text-emerald-400 w-12 shrink-0', children: 'Profile:' }),
                    jsxRuntime.jsxs(ChoiceSelect, {
                      value: connectionSettings.proxy_profile_id || '',
                      'aria-label': 'Cấu hình proxy',
                      onChange: handleProxyProfileChange,
                      className: 'flex-grow bg-slate-900 border border-slate-600 rounded text-xs p-1.5 text-white focus:border-emerald-500 outline-none',
                      children: [
                        jsxRuntime.jsx('option', { value: '', children: '-- Mặc định (Global) --' }),
                        proxyProfiles.map(profile => jsxRuntime.jsx('option', {
                          value: profile.id,
                          children: profile.name,
                        }, profile.id)),
                      ],
                    }),
                  ],
                }),
                jsxRuntime.jsxs('div', {
                  className: 'flex items-center gap-2',
                  children: [
                    jsxRuntime.jsx('span', { className: 'text-xs text-slate-400 w-12 shrink-0', children: 'Model:' }),
                    jsxRuntime.jsxs('div', {
                      className: 'flex-grow min-w-0 relative',
                      children: [
                        jsxRuntime.jsxs(ChoiceSelect, {
                          value: currentModelValue,
                          'aria-label': 'Mô hình',
                          onChange: handleModelChange,
                          disabled: isLoadingProxyModels,
                          className: 'w-full bg-slate-900 border border-slate-600 rounded text-xs p-1.5 text-white focus:border-indigo-500 outline-none disabled:opacity-50',
                          children: [
                            jsxRuntime.jsx('option', { value: '', children: '-- Chọn Model --' }),
                            (connectionSettings.source === 'aistudio'
                              ? [{
                                  id: connectionSettings.aistudio_model || 'gemini-2.5-flash',
                                  name: connectionSettings.aistudio_model || 'gemini-2.5-flash',
                                }]
                              : modelOptions
                            ).map(model => jsxRuntime.jsx('option', {
                              value: model.id,
                              children: model.name,
                            }, model.id)),
                          ],
                        }),
                        isLoadingProxyModels && jsxRuntime.jsx('div', {
                          className: 'absolute right-6 top-1/2 -translate-y-1/2',
                          children: jsxRuntime.jsx('div', {
                            className: 'w-3 h-3 border-2 border-sky-400 border-t-transparent rounded-full ',
                          }),
                        }),
                      ],
                    }),
                    ModelTestButton && buildSavedProbeTarget && testModel && jsxRuntime.jsx(ModelTestButton, {
                      target: buildSavedProbeTarget({
                        provider: connectionSettings.source,
                        model: currentModelValue,
                        profileId: connectionSettings.proxy_profile_id || '',
                        connections,
                        proxyPersistence,
                        proxy: {
                          url: getProxyUrl(),
                          password: getProxyPassword(),
                          legacyMode: getProxyLegacyMode(),
                          protocol: connectionSettings.proxy_protocol,
                        },
                      }),
                      testModel,
                      notify: showToast,
                    }),
                  ],
                }),
              ],
            }),
            jsxRuntime.jsx('div', { className: 'h-px bg-slate-700/50' }),
            jsxRuntime.jsxs('div', {
              className: 'space-y-1',
              children: [
                jsxRuntime.jsx('label', {
                  className: 'text-[10px] font-bold text-emerald-400 uppercase mb-2 block',
                  children: 'Persona (Hồ sơ)',
                }),
                jsxRuntime.jsxs('div', {
                  className: 'max-h-40 overflow-y-auto custom-scrollbar space-y-1 pr-1',
                  children: [
                    jsxRuntime.jsxs('button', {
                      onClick: () => {
                        if (onPersonaChange) onPersonaChange('');
                        onClose();
                      },
                      className: `w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium  flex items-center justify-between ${
                        activePersonaId
                          ? 'text-slate-400 hover:bg-slate-700 hover:text-white border border-transparent'
                          : 'bg-emerald-900/30 text-emerald-100 border border-emerald-500/30'
                      }`,
                      'aria-label': 'Không chọn hồ sơ nào',
                      children: [
                        jsxRuntime.jsx('span', { className: 'truncate italic', children: '-- Không chọn --' }),
                        !activePersonaId && jsxRuntime.jsx('span', {
                          className: 'text-[8px] text-emerald-400',
                          children: '●',
                        }),
                      ],
                    }),
                    personas.map(persona => jsxRuntime.jsxs('button', {
                      onClick: () => {
                        if (onPersonaChange) onPersonaChange(persona.id);
                        onClose();
                      },
                      className: `w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium  flex items-center justify-between ${
                        activePersonaId === persona.id
                          ? 'bg-emerald-900/30 text-emerald-100 border border-emerald-500/30'
                          : 'text-slate-400 hover:bg-slate-700 hover:text-white border border-transparent'
                      }`,
                      'aria-label': `Chọn hồ sơ ${persona.name}`,
                      children: [
                        jsxRuntime.jsx('span', { className: 'truncate', children: persona.name }),
                        activePersonaId === persona.id && jsxRuntime.jsx('span', {
                          className: 'text-[8px] text-emerald-400',
                          children: '●',
                        }),
                      ],
                    }, persona.id)),
                  ],
                }),
              ],
            }),
            jsxRuntime.jsx('div', { className: 'h-px bg-slate-700/50' }),
            jsxRuntime.jsxs('div', {
              className: 'space-y-1',
              children: [
                jsxRuntime.jsx('label', {
                  className: 'text-[10px] font-bold text-amber-400 uppercase mb-2 block',
                  children: 'Preset (Soul)',
                }),
                jsxRuntime.jsx('div', {
                  className: 'max-h-40 overflow-y-auto custom-scrollbar space-y-1 pr-1',
                  children: presets.map(preset => jsxRuntime.jsxs('button', {
                    onClick: () => {
                      if (onPresetChange) onPresetChange(preset.name);
                      onClose();
                    },
                    className: `w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium  flex items-center justify-between ${
                      activePresetName === preset.name
                        ? 'bg-amber-900/30 text-amber-100 border border-amber-500/30'
                        : 'text-slate-400 hover:bg-slate-700 hover:text-white border border-transparent'
                    }`,
                    'aria-label': `Chọn preset ${preset.name}`,
                    children: [
                      jsxRuntime.jsx('span', { className: 'truncate', children: preset.name }),
                      activePresetName === preset.name && jsxRuntime.jsx('span', {
                        className: 'text-[8px] text-amber-400',
                        children: '●',
                      }),
                    ],
                  }, preset.name)),
                }),
              ],
            }),
          ],
        }),
      ],
    });
  };
}
