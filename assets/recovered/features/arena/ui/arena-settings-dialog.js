import { resolveCatalogTarget, refreshDialogProxyCatalog } from '../../../../m4/providers/common/model-catalog.js';

export function createArenaSettingsDialog(getDependencies) {
  return function ArenaSettingsDialog({ isOpen, onClose }) {
    const {
      defaultProxyModels,
      ModelTestButton,
      fetchOpenRouterModels,
      defaultGeminiModels,
      useDialogFocus,
      connections,
      proxyPersistence,
      getProxyLegacyMode,
      react,
      getOpenRouterApiKey,
      buildSavedProbeTarget,
      getProxyProfiles,
      catalog,
      useToast,
      useGeminiCatalog,
      LoadingIndicator,
      getConnectionSettings,
      sessionStore,
      getOpenRouterCachedModels,
      testModel,
      getProxyUrl,
      jsxRuntime,
      getProxyPassword,
    } = getDependencies();

    const notify = useToast ? useToast().showToast : undefined;
    const {
      arenaProvider,
      setArenaProvider,
      arenaModelId,
      setArenaModelId,
      arenaUserProfileId,
      setArenaUserProfileId,
    } = sessionStore();

    const dialogRef = react.useRef(null);
    const [openRouterModels, setOpenRouterModels] = react.useState([]);
    const [proxyModels, setProxyModels] = react.useState([]);
    const [proxyProfiles, setProxyProfiles] = react.useState([]);
    const { models: geminiModels } = useGeminiCatalog(defaultGeminiModels);
    const [isLoadingModels, setIsLoadingModels] = react.useState(false);
    const [loadError, setLoadError] = react.useState(null);
    const closeButtonRef = react.useRef(null);

    useDialogFocus(isOpen, onClose, dialogRef, closeButtonRef);

    react.useEffect(() => {
      if (isOpen && !arenaProvider) {
        setArenaProvider('gemini');
      }
      if (isOpen) {
        setProxyProfiles(getProxyProfiles());
      }
    }, [isOpen, arenaProvider, setArenaProvider]);

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

    react.useEffect(() => {
      if (!isOpen) return;
      const controller = new AbortController();
      const isCurrent = () => !controller.signal.aborted;
      setIsLoadingModels(true);
      setLoadError(null);
      setProxyModels([]);

      (async () => {
        try {
          if (arenaProvider === 'openrouter') {
            if (!getOpenRouterApiKey()) {
              throw new Error('Chưa cấu hình API Key cho OpenRouter trong Cài đặt chính.');
            }
            setOpenRouterModels(getOpenRouterCachedModels());
            const fetchedModels = await fetchOpenRouterModels();
            if (isCurrent()) {
              setOpenRouterModels(fetchedModels);
            }
          } else if (arenaProvider === 'proxy') {
            const target = resolveCatalogTarget({
              profileId: arenaUserProfileId,
              profiles: getProxyProfiles(),
              global: {
                url: getProxyUrl(),
                password: getProxyPassword(),
                legacyMode: getProxyLegacyMode(),
                protocol: getConnectionSettings().proxy_protocol,
              },
            });
            await refreshDialogProxyCatalog({
              catalog,
              target,
              signal: controller.signal,
              isCurrent,
              publish: setProxyModels,
            });
          }
        } catch {
          if (isCurrent()) {
            setLoadError('Không tải được danh sách model. Kiểm tra cấu hình kết nối.');
          }
        } finally {
          if (isCurrent()) {
            setIsLoadingModels(false);
          }
        }
      })();

      return () => controller.abort();
    }, [arenaProvider, isOpen, arenaUserProfileId, proxyProfiles]);

    const availableModels = react.useMemo(() => {
      if (arenaProvider === 'gemini') return geminiModels;
      if (arenaProvider === 'openrouter') {
        return openRouterModels.map(model => ({
          id: model.id,
          name: `${model.name} (${model.pricing.prompt === '0' ? 'Free' : '$'})`,
        }));
      }
      if (arenaProvider === 'proxy') {
        return proxyModels.length > 0 ? proxyModels : defaultProxyModels;
      }
      return [];
    }, [arenaProvider, openRouterModels, proxyModels, geminiModels]);

    if (!isOpen) return null;

    return jsxRuntime.jsxs('div', {
      ref: dialogRef,
      className: 'absolute top-16 right-4 w-80 bg-slate-800 border border-slate-600 rounded-xl shadow-2xl z-50  flex flex-col max-h-[80vh]',
      role: 'dialog',
      'aria-modal': true,
      'aria-labelledby': 'arena-settings-title',
      children: [
        jsxRuntime.jsxs('div', {
          className: 'p-3 border-b border-slate-700 bg-slate-900/50 rounded-t-xl shrink-0 flex items-center justify-between',
          children: [
            jsxRuntime.jsxs('div', {
              className: 'flex items-center gap-2',
              children: [
                jsxRuntime.jsx('span', { className: 'text-rose-500 font-bold', children: 'VS' }),
                jsxRuntime.jsx('h3', {
                  id: 'arena-settings-title',
                  className: 'text-xs font-bold text-slate-300 uppercase tracking-wider',
                  children: 'Cài đặt Đấu trường',
                }),
              ],
            }),
            jsxRuntime.jsx('button', {
              ref: closeButtonRef,
              onClick: onClose,
              className: 'text-slate-400 hover:text-white',
              'aria-label': 'Đóng cài đặt Đấu trường',
              children: '✕',
            }),
          ],
        }),
        jsxRuntime.jsxs('div', {
          className: 'p-4 space-y-4 overflow-y-auto custom-scrollbar',
          children: [
            jsxRuntime.jsxs('div', {
              className: 'space-y-2',
              children: [
                jsxRuntime.jsx('label', {
                  className: 'text-[10px] font-bold text-indigo-400 uppercase',
                  children: 'Nhà cung cấp (Đối thủ)',
                }),
                jsxRuntime.jsx('div', {
                  className: 'flex bg-slate-900 rounded-lg p-1 border border-slate-700',
                  role: 'group',
                  'aria-label': 'Nhà cung cấp đối thủ',
                  children: ['gemini', 'openrouter', 'proxy'].map(providerId => jsxRuntime.jsx('button', {
                    onClick: () => setArenaProvider(providerId),
                    'aria-pressed': arenaProvider === providerId,
                    className: `flex-1 py-1.5 text-xs font-bold rounded  ${
                      arenaProvider === providerId
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`,
                    children: providerId === 'gemini' ? 'Gemini' : (providerId === 'openrouter' ? 'OR' : 'Proxy'),
                  }, providerId)),
                }),
              ],
            }),
            arenaProvider === 'proxy' && jsxRuntime.jsxs('div', {
              className: 'space-y-2 ',
              children: [
                jsxRuntime.jsx('label', {
                  className: 'text-[10px] font-bold text-emerald-400 uppercase',
                  children: 'Cấu hình Proxy (Profile)',
                }),
                jsxRuntime.jsxs('select', {
                  value: arenaUserProfileId || '',
                  'aria-label': 'Cấu hình Proxy đối thủ',
                  onChange: event => setArenaUserProfileId(event.target.value || null),
                  className: 'w-full bg-slate-900 border border-slate-600 rounded text-xs p-2 text-white focus:border-emerald-500 outline-none',
                  children: [
                    jsxRuntime.jsx('option', { value: '', children: '-- Mặc định (Global Settings) --' }),
                    proxyProfiles.map(profile => jsxRuntime.jsx('option', {
                      value: profile.id,
                      children: profile.name,
                    }, profile.id)),
                  ],
                }),
              ],
            }),
            jsxRuntime.jsxs('div', {
              className: 'space-y-2',
              children: [
                jsxRuntime.jsx('label', {
                  className: 'text-[10px] font-bold text-sky-400 uppercase',
                  children: 'Model Đối thủ',
                }),
                isLoadingModels
                  ? jsxRuntime.jsx('div', {
                      className: 'py-2 flex justify-center',
                      children: jsxRuntime.jsx(LoadingIndicator, { message: 'Đang tải danh sách...' }),
                    })
                  : loadError
                    ? jsxRuntime.jsx('div', {
                        className: 'text-xs text-red-400 bg-red-900/20 p-2 rounded border border-red-900/50',
                        children: loadError,
                      })
                    : jsxRuntime.jsxs('div', {
                        className: 'flex items-center gap-2',
                        children: [
                          jsxRuntime.jsxs('select', {
                            value: arenaModelId || '',
                            'aria-label': 'Model đối thủ',
                            onChange: event => setArenaModelId(event.target.value),
                            className: 'flex-1 min-w-0 bg-slate-900 border border-slate-600 rounded text-xs p-2 text-white focus:border-rose-500 outline-none',
                            children: [
                              jsxRuntime.jsx('option', { value: '', children: '-- Chọn Model --' }),
                              availableModels.map(model => jsxRuntime.jsx('option', {
                                value: model.id,
                                children: model.name,
                              }, model.id)),
                            ],
                          }),
                          ModelTestButton && buildSavedProbeTarget && testModel && jsxRuntime.jsx(ModelTestButton, {
                            target: buildSavedProbeTarget({
                              provider: arenaProvider || 'gemini',
                              model: arenaModelId || '',
                              profileId: arenaUserProfileId || '',
                              connections,
                              proxyPersistence,
                              proxy: {
                                url: getProxyUrl(),
                                password: getProxyPassword(),
                                legacyMode: getProxyLegacyMode(),
                                protocol: getConnectionSettings().proxy_protocol,
                              },
                            }),
                            testModel,
                            notify,
                          }),
                        ],
                      }),
              ],
            }),
            jsxRuntime.jsx('div', {
              className: 'text-[10px] text-slate-500 italic',
              children: '* Lưu ý: Cấu hình chi tiết (API Key, URL) được lấy từ Cài đặt chính hoặc Profile đã chọn.',
            }),
          ],
        }),
      ],
    });
  };
}
