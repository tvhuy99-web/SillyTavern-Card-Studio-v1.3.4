import { createChoiceSelect } from '../../../recovered/ui/components/dialog-focus.js';
import { buildProbeTarget, createModelTestButton } from './model-test-button.js';
import { useConnectionSettings } from './settings-controller.js';
import { openAiStudioSession } from '../../../m4/providers/aistudio/text.js';

const THINKING_LEVELS = [
  { value: 'default', label: 'Mặc định theo trang web (AI Studio)' },
  { value: 'minimal', label: 'Tối thiểu' },
  { value: 'low', label: 'Thấp' },
  { value: 'medium', label: 'Trung bình' },
  { value: 'high', label: 'Cao' },
];

const PROVIDERS = [
  { value: 'gemini', label: 'Google Gemini' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'proxy', label: 'Reverse Proxy' },
  { value: 'aistudio', label: 'Tài khoản Google / AI Studio' },
];

export function createConnectionSettingsScreen(jsxRuntime, react, getDependencies) {
  const ChoiceSelect = createChoiceSelect(() => ({ react, jsxRuntime }));
  const ModelTestButton = createModelTestButton(jsxRuntime, react);

  return function ConnectionSettingsScreen() {
    const dependencies = getDependencies();
    const {
      LoadingIndicator,
      ModelSelect,
      SearchableSelect,
      TextInput,
      ToggleSwitch,
      connections,
      defaultGeminiModels,
      proxyPersistence,
      request,
      saveProfiles,
    } = dependencies;

    const {
      showToast,
      settings,
      setSettings,
      useDefaultGeminiKey,
      setUseDefaultGeminiKey,
      geminiKeysText,
      setGeminiKeysText,
      openRouterKey,
      setOpenRouterKey,
      openRouterModels,
      openRouterLoading,
      freeOnly,
      setFreeOnly,
      keyChecking,
      setKeyChecking,
      keyStatus,
      setKeyStatus,
      proxyUrl,
      setProxyUrl,
      proxyPassword,
      setProxyPassword,
      legacyMode,
      setLegacyMode,
      setProxyForTools,
      rememberProxySecrets,
      setRememberProxySecrets,
      pingLoading,
      pingStatus,
      pingError,
      proxyLoading,
      profiles,
      setProfiles,
      profileId,
      setProfileId,
      profileFileRef,
      saveStatus,
      geminiModels,
      geminiLoading,
      refreshGeminiModels,
      updateSetting,
      loadOpenRouterModels,
      filteredOpenRouterModels,
      selectProfile,
      proxyModelOptions,
      aiStudioModels,
      aiStudioLoading,
      loadProxyModels,
      invalidateProxyCatalog,
      pingProxy,
      loadAiStudioModels,
      clearAiStudioModels,
      aiStudioStatus,
      aiStudioVisible,
      aiStudioVisibilityBusy,
      changeAiStudioVisibility,
      applySettings,
    } = useConnectionSettings({ ...dependencies, react });

    const [activeApiTab, setActiveApiTab] = react.useState('main');
    const [isOptionsOpen, setIsOptionsOpen] = react.useState(false);
    const [profileDialogMode, setProfileDialogMode] = react.useState(null);
    const [profileNameInput, setProfileNameInput] = react.useState('');
    const menuRef = react.useRef(null);

    if (typeof react.useEffect === 'function') {
      react.useEffect(() => {
        if (!isOptionsOpen) return;
        const onOutside = event => {
          if (menuRef.current && !menuRef.current.contains(event.target)) setIsOptionsOpen(false);
        };
        const onKey = event => {
          if (event.key === 'Escape') setIsOptionsOpen(false);
        };
        document.addEventListener('mousedown', onOutside);
        document.addEventListener('keydown', onKey);
        return () => {
          document.removeEventListener('mousedown', onOutside);
          document.removeEventListener('keydown', onKey);
        };
      }, [isOptionsOpen]);
    }

    const isAuxTab = activeApiTab === 'aux';
    const auxUseMain = settings.aux_use_main ?? true;
    const activeProvider = isAuxTab
      ? (auxUseMain ? settings.source : (settings.aux_source || settings.source || 'gemini'))
      : (settings.source || 'gemini');

    const activeProfileId = isAuxTab ? (settings.aux_profile_id || profileId || '') : (profileId || '');
    const providerProfiles = (profiles || []).filter(p => (p.provider || 'proxy') === activeProvider);
    const selectedProfile = providerProfiles.find(p => p.id === activeProfileId) || null;

    const handleProviderChange = nextProvider => {
      if (isAuxTab) {
        updateSetting('aux_source', nextProvider);
        updateSetting('aux_use_main', false);
        setProxyForTools(nextProvider === 'proxy');
      } else {
        updateSetting('source', nextProvider);
      }
    };

    const getActiveModelValue = () => {
      if (isAuxTab) {
        if (activeProvider === 'gemini') return settings.aux_gemini_model || settings.gemini_model || '';
        if (activeProvider === 'openrouter') return settings.aux_openrouter_model || settings.openrouter_model || '';
        if (activeProvider === 'proxy') return settings.proxy_tool_model || settings.proxy_model || '';
        return settings.aistudio_tool_model || settings.aistudio_model || '';
      }
      if (activeProvider === 'gemini') return settings.gemini_model || '';
      if (activeProvider === 'openrouter') return settings.openrouter_model || '';
      if (activeProvider === 'proxy') return settings.proxy_model || '';
      return settings.aistudio_model || '';
    };

    const handleModelChange = nextModel => {
      if (isAuxTab) {
        if (activeProvider === 'gemini') updateSetting('aux_gemini_model', nextModel);
        else if (activeProvider === 'openrouter') updateSetting('aux_openrouter_model', nextModel);
        else if (activeProvider === 'proxy') updateSetting('proxy_tool_model', nextModel);
        else updateSetting('aistudio_tool_model', nextModel);
      } else {
        if (activeProvider === 'gemini') updateSetting('gemini_model', nextModel);
        else if (activeProvider === 'openrouter') updateSetting('openrouter_model', nextModel);
        else if (activeProvider === 'proxy') updateSetting('proxy_model', nextModel);
        else updateSetting('aistudio_model', nextModel);
      }
    };

    const handleSelectSavedProfile = id => {
      if (isAuxTab) updateSetting('aux_profile_id', id);
      if (!id) {
        if (!isAuxTab) setProfileId('');
        return;
      }
      const matched = (profiles || []).find(p => p.id === id);
      if (!matched) return;
      const pType = matched.provider || 'proxy';
      if (pType === 'proxy') {
        return selectProfile(id);
      } else if (pType === 'gemini') {
        setProfileId(id);
        if (typeof matched.useDefaultGeminiKey === 'boolean') setUseDefaultGeminiKey(matched.useDefaultGeminiKey);
        if (typeof matched.geminiKeysText === 'string') setGeminiKeysText(matched.geminiKeysText);
        if (matched.chatModel) handleModelChange(matched.chatModel);
      } else if (pType === 'openrouter') {
        setProfileId(id);
        if (typeof matched.openRouterKey === 'string') setOpenRouterKey(matched.openRouterKey);
        if (matched.chatModel) handleModelChange(matched.chatModel);
      } else if (pType === 'aistudio') {
        setProfileId(id);
        if (matched.chatModel) handleModelChange(matched.chatModel);
      }
    };

    const buildCurrentProfileRecord = (id, name) => ({
      id,
      name,
      provider: activeProvider,
      url: activeProvider === 'proxy' ? proxyUrl : '',
      password: activeProvider === 'proxy' ? proxyPassword : '',
      legacyMode: activeProvider === 'proxy' ? legacyMode : false,
      protocol: activeProvider === 'proxy' ? (settings.proxy_protocol || 'openai') : undefined,
      useDefaultGeminiKey: activeProvider === 'gemini' ? useDefaultGeminiKey : undefined,
      geminiKeysText: activeProvider === 'gemini' ? geminiKeysText : undefined,
      openRouterKey: activeProvider === 'openrouter' ? openRouterKey : undefined,
      chatModel: getActiveModelValue(),
      toolModel: settings.proxy_tool_model || getActiveModelValue(),
      proxyForTools: activeProvider === 'proxy' && isAuxTab,
    });

    const handleConfirmProfileDialog = () => {
      const cleanName = profileNameInput.trim();
      if (!cleanName) {
        showToast('Tên cấu hình không được để trống.', 'error');
        return;
      }
      if (profileDialogMode === 'save') {
        const nextId = `profile_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        const record = buildCurrentProfileRecord(nextId, cleanName);
        const nextProfiles = [...(profiles || []), record];
        setProfiles(nextProfiles);
        saveProfiles(nextProfiles);
        setProfileId(nextId);
        if (isAuxTab) updateSetting('aux_profile_id', nextId);
        showToast(`Đã lưu cấu hình "${cleanName}".`, 'success');
      } else if (profileDialogMode === 'rename' && selectedProfile) {
        const nextProfiles = (profiles || []).map(p => (
          p.id === selectedProfile.id ? { ...p, name: cleanName } : p
        ));
        setProfiles(nextProfiles);
        saveProfiles(nextProfiles);
        showToast(`Đã đổi tên cấu hình thành "${cleanName}".`, 'success');
      }
      setProfileDialogMode(null);
    };

    const handleDeleteProfile = () => {
      if (!selectedProfile) return;
      if (!window.confirm(`Xóa cấu hình "${selectedProfile.name}"?`)) return;
      const nextProfiles = (profiles || []).filter(p => p.id !== selectedProfile.id);
      setProfiles(nextProfiles);
      saveProfiles(nextProfiles);
      if (profileId === selectedProfile.id) setProfileId('');
      if (settings.aux_profile_id === selectedProfile.id) updateSetting('aux_profile_id', '');
      showToast(`Đã xóa cấu hình "${selectedProfile.name}".`, 'info');
    };

    const handleExportProfiles = () => {
      try {
        const exportList = selectedProfile ? [selectedProfile] : providerProfiles;
        const json = JSON.stringify(exportList, null, 2);
        const url = 'data:text/json;charset=utf-8,' + encodeURIComponent(json);
        const anchor = document.createElement('a');
        anchor.setAttribute('href', url);
        anchor.setAttribute('download', `api_config_${activeProvider}.json`);
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        showToast('Đã xuất cấu hình API.', 'success');
      } catch {
        showToast('Không thể xuất cấu hình API.', 'error');
      }
    };

    const handleImportProfiles = async event => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const parsed = JSON.parse(await file.text());
        const imported = Array.isArray(parsed) ? parsed : [parsed];
        const valid = imported.filter(item => item && typeof item === 'object' && typeof item.name === 'string' && item.name.trim()).map((item, idx) => ({
          ...item,
          id: item.id || `imported_${Date.now()}_${idx}`,
          provider: item.provider || activeProvider,
        }));
        if (!valid.length) throw new Error('Tệp cấu hình không hợp lệ.');
        const existingIds = new Set((profiles || []).map(p => p.id));
        const merged = [...(profiles || []), ...valid.map(item => (
          existingIds.has(item.id) ? { ...item, id: `${item.id}_${Date.now()}` } : item
        ))];
        setProfiles(merged);
        saveProfiles(merged);
        showToast(`Đã nhập ${valid.length} cấu hình.`, 'success');
      } catch (err) {
        showToast(`Lỗi nhập cấu hình: ${err instanceof Error ? err.message : String(err)}`, 'error');
      } finally {
        event.target.value = '';
      }
    };

    const handleLoadModels = async () => {
      if (activeProvider === 'gemini') {
        let apiKey = useDefaultGeminiKey ? connections.getGeminiCatalogKeyForEnvironment() : undefined;
        if (!useDefaultGeminiKey) {
          const keys = geminiKeysText.split('\n').map(k => k.trim()).filter(Boolean);
          if (!keys.length) {
            showToast('Vui lòng nhập API Key.', 'warning');
            return;
          }
          apiKey = keys[0];
        }
        try {
          const models = await refreshGeminiModels(apiKey);
          showToast(`Đã tải ${models.length} mô hình từ Google Gemini.`, 'success');
        } catch (err) {
          showToast(`Lỗi tải mô hình: ${err instanceof Error ? err.message : String(err)}`, 'error');
        }
      } else if (activeProvider === 'openrouter') {
        await loadOpenRouterModels();
      } else if (activeProvider === 'proxy') {
        await loadProxyModels();
      } else if (activeProvider === 'aistudio') {
        await loadAiStudioModels();
      }
    };

    const handleCheckOpenRouterKey = async () => {
      if (!openRouterKey) return;
      setKeyChecking(true);
      setKeyStatus('idle');
      try {
        const res = await request('https://openrouter.ai/api/v1/auth/key', {
          method: 'GET',
          headers: { Authorization: `Bearer ${openRouterKey}` },
        });
        if (!res.ok) throw new Error('Invalid API Key');
        setKeyStatus('success');
        if (!openRouterModels?.length) loadOpenRouterModels();
      } catch {
        setKeyStatus('error');
      } finally {
        setKeyChecking(false);
      }
    };

    const isModelsLoading = activeProvider === 'gemini'
      ? geminiLoading
      : activeProvider === 'openrouter'
        ? openRouterLoading
        : activeProvider === 'proxy'
          ? proxyLoading
          : aiStudioLoading;

    const activeModelValue = getActiveModelValue();
    const modelTestButton = dependencies.testModel ? jsxRuntime.jsx(ModelTestButton, {
      target: buildProbeTarget({
        provider: activeProvider,
        model: activeModelValue,
        useDefaultGeminiKey,
        geminiKeysText,
        openRouterKey,
        proxy: { url: proxyUrl, password: proxyPassword, legacyMode, protocol: settings.proxy_protocol },
        connections,
      }),
      testModel: dependencies.testModel,
      notify: showToast,
    }) : undefined;

    const runMenuAction = action => {
      setIsOptionsOpen(false);
      return action();
    };

    const renderProviderInputs = () => {
      if (activeProvider === 'proxy') {
        return jsxRuntime.jsxs('div', {
          className: 'space-y-4 bg-slate-900/50 p-4 rounded-lg border border-slate-700',
          children: [
            jsxRuntime.jsx(TextInput, {
              label: 'Proxy URL',
              value: proxyUrl,
              onChange: event => {
                invalidateProxyCatalog();
                if (event.target.value.trim() !== proxyUrl.trim()) setProxyPassword('');
                setProxyUrl(event.target.value);
              },
              placeholder: 'https://your-proxy.example/v1',
            }),
            jsxRuntime.jsx(TextInput, {
              label: 'Password / Key',
              type: 'password',
              value: proxyPassword,
              onChange: event => {
                invalidateProxyCatalog();
                setProxyPassword(event.target.value);
              },
              placeholder: 'Nhập API Key hoặc mật khẩu Proxy...',
            }),
            jsxRuntime.jsxs('div', {
              children: [
                jsxRuntime.jsx('label', {
                  'aria-hidden': 'true',
                  className: 'block text-sm font-medium text-slate-300 mb-1',
                  children: 'Giao thức Proxy',
                }),
                jsxRuntime.jsxs(ChoiceSelect, {
                  'aria-label': 'Giao thức Proxy',
                  value: settings.proxy_protocol || 'openai',
                  onChange: event => updateSetting('proxy_protocol', event.target.value),
                  className: 'w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100',
                  children: [
                    jsxRuntime.jsx('option', { value: 'openai', children: 'Chuẩn OpenAI' }),
                    jsxRuntime.jsx('option', { value: 'google_native', children: 'Google Native' }),
                  ],
                }),
              ],
            }),
            pingStatus === 'success' && jsxRuntime.jsx('p', {
              className: 'text-xs text-emerald-400',
              children: 'Kết nối Proxy thành công.',
            }),
            pingStatus === 'error' && jsxRuntime.jsx('p', {
              className: 'text-xs text-red-400',
              children: `Lỗi kiểm tra Proxy: ${pingError}`,
            }),
          ],
        });
      }

      if (activeProvider === 'gemini') {
        return jsxRuntime.jsxs('div', {
          className: 'space-y-4 bg-slate-900/50 p-4 rounded-lg border border-slate-700',
          children: [
            jsxRuntime.jsx(ToggleSwitch, {
              label: 'Sử dụng API Key mặc định',
              checked: useDefaultGeminiKey,
              onChange: setUseDefaultGeminiKey,
            }),
            !useDefaultGeminiKey && jsxRuntime.jsxs('div', {
              children: [
                jsxRuntime.jsx('label', {
                  'aria-hidden': 'true',
                  className: 'block text-sm font-medium text-slate-300 mb-1',
                  children: 'Gemini API Key (mỗi dòng 1 key)',
                }),
                jsxRuntime.jsx('textarea', {
                  'aria-label': 'Gemini API Key',
                  rows: 3,
                  value: geminiKeysText,
                  onChange: event => setGeminiKeysText(event.target.value),
                  placeholder: 'AIza...',
                  className: 'w-full bg-slate-800 border border-slate-600 rounded-lg p-2.5 text-sm font-mono text-slate-100',
                }),
              ],
            }),
          ],
        });
      }

      if (activeProvider === 'openrouter') {
        return jsxRuntime.jsxs('div', {
          className: 'space-y-4 bg-slate-900/50 p-4 rounded-lg border border-slate-700',
          children: [
            jsxRuntime.jsx(TextInput, {
              label: 'OpenRouter API Key',
              type: 'password',
              value: openRouterKey,
              onChange: event => setOpenRouterKey(event.target.value),
              placeholder: 'sk-or-...',
            }),
            jsxRuntime.jsx(ToggleSwitch, {
              label: 'Chỉ hiển thị mô hình miễn phí',
              checked: freeOnly,
              onChange: setFreeOnly,
            }),
            keyStatus === 'success' && jsxRuntime.jsx('p', {
              className: 'text-xs text-emerald-400',
              children: 'Key hợp lệ.',
            }),
            keyStatus === 'error' && jsxRuntime.jsx('p', {
              className: 'text-xs text-red-400',
              children: 'Key không hợp lệ.',
            }),
          ],
        });
      }

      return jsxRuntime.jsxs('div', {
        className: 'space-y-3 bg-slate-900/50 p-4 rounded-lg border border-slate-700',
        children: [
          jsxRuntime.jsx('p', {
            className: 'text-sm text-slate-300',
            children: 'Sử dụng phiên đăng nhập Google AI Studio trực tiếp trên thiết bị.',
          }),
          jsxRuntime.jsx('button', {
            type: 'button',
            onClick: async () => {
              try {
                await openAiStudioSession();
              } catch (error) {
                showToast('AI Studio: ' + (error?.message || String(error)), 'error');
              }
            },
            className: 'w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white',
            children: 'Mở Google / AI Studio để đăng nhập',
          }),
          jsxRuntime.jsxs('label', {
            className: 'flex items-center gap-3 rounded-lg border border-slate-600 bg-slate-900/60 p-3 cursor-pointer',
            children: [
              jsxRuntime.jsx('input', {
                type: 'checkbox',
                checked: aiStudioVisible,
                disabled: aiStudioVisibilityBusy,
                onChange: event => changeAiStudioVisibility(event.target.checked),
                className: 'h-5 w-5 accent-indigo-500',
                'aria-label': 'Hiển thị trang web AI Studio',
              }),
              jsxRuntime.jsx('span', {
                className: 'text-sm font-semibold text-slate-100',
                'aria-hidden': 'true',
                children: 'Hiển thị trang web AI Studio',
              }),
            ],
          }),
          aiStudioStatus && jsxRuntime.jsx('p', {
            'data-sts-aistudio-model-status': true,
            className: 'text-xs ' + (aiStudioStatus.kind === 'error' ? 'text-red-400' : 'text-sky-300'),
            children: aiStudioStatus.message,
          }),
        ],
      });
    };

    const renderModelSelector = () => {
      if (activeProvider === 'gemini') {
        return jsxRuntime.jsx(SearchableSelect, {
          label: 'Chọn mô hình',
          value: activeModelValue,
          onChange: event => handleModelChange(event.target.value),
          options: (geminiModels || []).map(model => ({ value: model.id, label: model.name })),
          disabled: geminiLoading,
          testButton: modelTestButton,
        });
      }
      if (activeProvider === 'openrouter') {
        return jsxRuntime.jsx(SearchableSelect, {
          label: 'Chọn mô hình',
          value: activeModelValue,
          onChange: event => handleModelChange(event.target.value),
          options: (filteredOpenRouterModels || []).map(model => ({ value: model.id, label: model.name || model.id })),
          disabled: openRouterLoading,
          testButton: modelTestButton,
        });
      }
      if (activeProvider === 'proxy') {
        return jsxRuntime.jsx(ModelSelect, {
          label: 'Chọn mô hình',
          value: activeModelValue,
          onChange: handleModelChange,
          options: proxyModelOptions || [],
          provider: 'proxy',
          testButton: modelTestButton,
        });
      }
      const aiStudioOptions = (aiStudioModels?.length ? aiStudioModels : defaultGeminiModels || []).map(m => (
        typeof m === 'string' ? { id: m, name: m } : { id: m.id, name: m.name || m.id }
      ));
      return jsxRuntime.jsx(ModelSelect, {
        label: 'Chọn mô hình',
        value: activeModelValue,
        onChange: handleModelChange,
        options: aiStudioOptions,
        provider: 'aistudio',
        testButton: modelTestButton,
      });
    };

    const directFetchEnabled = settings.directFetchBypass ?? true;

    return jsxRuntime.jsxs('div', {
      className: 'bg-slate-800/50 p-5 rounded-xl shadow-lg max-w-3xl mx-auto space-y-5',
      children: [
        jsxRuntime.jsx('h2', {
          className: 'text-xl font-bold text-slate-100',
          children: 'Thiết lập API',
        }),
        jsxRuntime.jsxs('div', {
          role: 'tablist',
          'aria-label': 'Chọn loại API',
          className: 'flex gap-1 p-1 bg-slate-900 rounded-lg',
          children: [
            jsxRuntime.jsx('button', {
              id: 'api-tab-main',
              type: 'button',
              role: 'tab',
              'aria-selected': !isAuxTab ? 'true' : 'false',
              'aria-controls': 'api-tabpanel-main',
              onClick: () => setActiveApiTab('main'),
              className: 'flex-1 py-2 text-sm font-semibold rounded-md ' + (!isAuxTab ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-800'),
              children: 'API chính',
            }),
            jsxRuntime.jsx('button', {
              id: 'api-tab-aux',
              type: 'button',
              role: 'tab',
              'aria-selected': isAuxTab ? 'true' : 'false',
              'aria-controls': 'api-tabpanel-aux',
              onClick: () => setActiveApiTab('aux'),
              className: 'flex-1 py-2 text-sm font-semibold rounded-md ' + (isAuxTab ? 'bg-sky-600 text-white' : 'text-slate-300 hover:bg-slate-800'),
              children: 'API phụ',
            }),
          ],
        }),
        jsxRuntime.jsxs('div', {
          id: `api-tabpanel-${activeApiTab}`,
          role: 'tabpanel',
          'aria-labelledby': `api-tab-${activeApiTab}`,
          className: 'space-y-4',
          children: [
            jsxRuntime.jsx('h3', {
              className: 'text-lg font-bold text-sky-400',
              children: isAuxTab ? 'API phụ' : 'API chính',
            }),
            isAuxTab && jsxRuntime.jsx(ToggleSwitch, {
              label: 'Dùng chung nhà cung cấp với API chính',
              checked: auxUseMain,
              onChange: enabled => {
                updateSetting('aux_use_main', enabled);
                if (!enabled && !settings.aux_source) updateSetting('aux_source', settings.source || 'gemini');
              },
            }),
            jsxRuntime.jsxs('div', {
              className: 'flex items-center gap-3',
              children: [
                jsxRuntime.jsx(ChoiceSelect, {
                  'aria-label': isAuxTab ? 'Nhà cung cấp API phụ' : 'Nhà cung cấp API chính',
                  value: activeProvider,
                  disabled: isAuxTab && auxUseMain,
                  onChange: event => handleProviderChange(event.target.value),
                  className: 'flex-grow min-w-0 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50',
                  children: PROVIDERS.map(item => jsxRuntime.jsx('option', {
                    value: item.value,
                    children: item.label,
                  }, item.value)),
                }),
                jsxRuntime.jsxs('div', {
                  ref: menuRef,
                  className: 'relative flex-shrink-0',
                  children: [
                    jsxRuntime.jsx('button', {
                      type: 'button',
                      'aria-haspopup': 'menu',
                      'aria-expanded': isOptionsOpen ? 'true' : 'false',
                      onClick: () => setIsOptionsOpen(open => !open),
                      className: 'px-3.5 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-100 text-sm font-semibold rounded-lg border border-slate-600',
                      children: 'Tùy chọn khác',
                    }),
                    isOptionsOpen && jsxRuntime.jsxs('div', {
                      role: 'menu',
                      'aria-label': 'Tùy chọn cấu hình API',
                      className: 'absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-xl py-1.5 z-30',
                      children: [
                        jsxRuntime.jsx('button', {
                          type: 'button',
                          role: 'menuitem',
                          onClick: () => runMenuAction(() => {
                            setProfileNameInput(selectedProfile?.name || '');
                            setProfileDialogMode('save');
                          }),
                          className: 'w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800',
                          children: 'Lưu',
                        }),
                        jsxRuntime.jsx('button', {
                          type: 'button',
                          role: 'menuitem',
                          disabled: !selectedProfile,
                          onClick: () => runMenuAction(() => {
                            setProfileNameInput(selectedProfile?.name || '');
                            setProfileDialogMode('rename');
                          }),
                          className: 'w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-40',
                          children: 'Đổi tên',
                        }),
                        jsxRuntime.jsx('button', {
                          type: 'button',
                          role: 'menuitem',
                          onClick: () => runMenuAction(() => profileFileRef.current?.click()),
                          className: 'w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800',
                          children: 'Nhập',
                        }),
                        jsxRuntime.jsx('button', {
                          type: 'button',
                          role: 'menuitem',
                          disabled: providerProfiles.length === 0,
                          onClick: () => runMenuAction(handleExportProfiles),
                          className: 'w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-40',
                          children: 'Xuất',
                        }),
                        jsxRuntime.jsx('button', {
                          type: 'button',
                          role: 'menuitem',
                          disabled: !selectedProfile,
                          onClick: () => runMenuAction(handleDeleteProfile),
                          className: 'w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-950/60 disabled:opacity-40',
                          children: 'Xóa',
                        }),
                        jsxRuntime.jsx('button', {
                          type: 'button',
                          role: 'menuitem',
                          onClick: () => runMenuAction(() => updateSetting('directFetchBypass', !directFetchEnabled)),
                          className: 'w-full text-left px-4 py-2.5 text-sm text-sky-300 hover:bg-slate-800 border-t border-slate-800',
                          children: `Tự động Kết nối Trực tiếp: ${directFetchEnabled ? 'BẬT' : 'TẮT'}`,
                        }),
                        activeProvider === 'openrouter' && jsxRuntime.jsx('button', {
                          type: 'button',
                          role: 'menuitem',
                          disabled: keyChecking || !openRouterKey,
                          onClick: () => runMenuAction(handleCheckOpenRouterKey),
                          className: 'w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-40',
                          children: keyChecking ? 'Đang kiểm tra Key...' : 'Kiểm tra API Key',
                        }),
                        activeProvider === 'proxy' && jsxRuntime.jsx('button', {
                          type: 'button',
                          role: 'menuitem',
                          onClick: () => runMenuAction(() => {
                            try {
                              proxyPersistence.setRememberSecrets(!rememberProxySecrets);
                              setRememberProxySecrets(!rememberProxySecrets);
                            } catch {
                              showToast('Không thể lưu tùy chọn ghi nhớ Proxy.', 'error');
                            }
                          }),
                          className: 'w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800',
                          children: `Ghi nhớ Password / Key: ${rememberProxySecrets ? 'BẬT' : 'TẮT'}`,
                        }),
                        activeProvider === 'proxy' && jsxRuntime.jsx('button', {
                          type: 'button',
                          role: 'menuitem',
                          onClick: () => runMenuAction(() => {
                            invalidateProxyCatalog();
                            setLegacyMode(!legacyMode);
                          }),
                          className: 'w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800',
                          children: `Chế độ tương thích (Legacy): ${legacyMode ? 'BẬT' : 'TẮT'}`,
                        }),
                        activeProvider === 'proxy' && jsxRuntime.jsx('button', {
                          type: 'button',
                          role: 'menuitem',
                          disabled: pingLoading || !proxyUrl.trim(),
                          onClick: () => runMenuAction(pingProxy),
                          className: 'w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-40',
                          children: pingLoading ? 'Đang kiểm tra kết nối...' : 'Kiểm tra kết nối (Ping)',
                        }),
                        activeProvider === 'aistudio' && jsxRuntime.jsx('button', {
                          type: 'button',
                          role: 'menuitem',
                          disabled: aiStudioVisibilityBusy,
                          onClick: () => runMenuAction(() => changeAiStudioVisibility(!aiStudioVisible)),
                          className: 'w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-40',
                          children: `Hiển thị trang AI Studio: ${aiStudioVisible ? 'BẬT' : 'TẮT'}`,
                        }),
                        activeProvider === 'aistudio' && jsxRuntime.jsx('button', {
                          type: 'button',
                          role: 'menuitem',
                          onClick: () => runMenuAction(clearAiStudioModels),
                          className: 'w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-950/60',
                          children: 'Xóa danh sách model AI Studio',
                        }),
                      ],
                    }),
                  ],
                }),
              ],
            }),
            jsxRuntime.jsxs(ChoiceSelect, {
              'aria-label': 'Chọn cấu hình đã lưu',
              value: activeProfileId,
              disabled: isAuxTab && auxUseMain,
              onChange: event => handleSelectSavedProfile(event.target.value),
              className: 'w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50',
              children: [
                jsxRuntime.jsx('option', { value: '', children: '-- Chọn cấu hình đã lưu --' }),
                providerProfiles.map(profile => jsxRuntime.jsx('option', {
                  value: profile.id,
                  children: profile.name,
                }, profile.id)),
              ],
            }),
            jsxRuntime.jsx('input', {
              ref: profileFileRef,
              type: 'file',
              'aria-label': 'Nhập tệp cấu hình API JSON',
              accept: '.json',
              hidden: true,
              onChange: handleImportProfiles,
            }),
            !(isAuxTab && auxUseMain) && renderProviderInputs(),
            jsxRuntime.jsxs('div', {
              className: 'space-y-3',
              children: [
                jsxRuntime.jsx('button', {
                  type: 'button',
                  disabled: isModelsLoading,
                  onClick: handleLoadModels,
                  className: 'w-full py-2.5 px-4 bg-slate-700 hover:bg-slate-600 text-sky-300 font-semibold text-sm rounded-lg border border-slate-600 disabled:opacity-50 flex items-center justify-center gap-2',
                  children: isModelsLoading
                    ? jsxRuntime.jsx(LoadingIndicator, { message: 'Đang tải mô hình...' })
                    : 'Tải mô hình',
                }),
                renderModelSelector(),
                activeProvider === 'aistudio' && jsxRuntime.jsx(SearchableSelect, {
                  label: isAuxTab ? 'Mức suy nghĩ API phụ' : 'Mức suy nghĩ API chính',
                  value: settings[isAuxTab ? 'aistudio_tool_thinking' : 'aistudio_thinking'] || 'default',
                  options: THINKING_LEVELS,
                  onChange: event => updateSetting(isAuxTab ? 'aistudio_tool_thinking' : 'aistudio_thinking', event.target.value),
                }),
              ],
            }),
            jsxRuntime.jsxs('div', {
              className: 'flex justify-end items-center gap-4 pt-4 border-t border-slate-700',
              children: [
                saveStatus === 'saved' && jsxRuntime.jsx('span', {
                  className: 'text-sm text-green-400 font-bold',
                  children: 'Đã lưu!',
                }),
                saveStatus === 'error' && jsxRuntime.jsx('span', {
                  className: 'text-sm text-red-400 font-bold',
                  children: 'Lỗi khi lưu!',
                }),
                jsxRuntime.jsx('button', {
                  type: 'button',
                  onClick: applySettings,
                  className: 'bg-sky-600 hover:bg-sky-700 text-white font-bold py-2.5 px-8 rounded-lg shadow-lg',
                  children: 'Áp dụng',
                }),
              ],
            }),
          ],
        }),
        profileDialogMode && jsxRuntime.jsx('div', {
          className: 'fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4',
          onClick: () => setProfileDialogMode(null),
          children: jsxRuntime.jsxs('div', {
            role: 'dialog',
            'aria-modal': 'true',
            'aria-label': profileDialogMode === 'save' ? 'Lưu cấu hình API' : 'Đổi tên cấu hình API',
            className: 'w-full max-w-sm bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-5 space-y-4',
            onClick: event => event.stopPropagation(),
            children: [
              jsxRuntime.jsx('h3', {
                className: 'text-lg font-bold text-slate-100',
                children: profileDialogMode === 'save' ? 'Lưu cấu hình API' : 'Đổi tên cấu hình API',
              }),
              jsxRuntime.jsx('input', {
                type: 'text',
                'aria-label': 'Tên cấu hình',
                value: profileNameInput,
                onChange: event => setProfileNameInput(event.target.value),
                placeholder: 'Nhập tên cấu hình...',
                className: 'w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100',
              }),
              jsxRuntime.jsxs('div', {
                className: 'flex justify-end gap-2',
                children: [
                  jsxRuntime.jsx('button', {
                    type: 'button',
                    onClick: () => setProfileDialogMode(null),
                    className: 'px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm font-semibold',
                    children: 'Hủy',
                  }),
                  jsxRuntime.jsx('button', {
                    type: 'button',
                    onClick: handleConfirmProfileDialog,
                    className: 'px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-sm font-semibold',
                    children: 'Đồng ý',
                  }),
                ],
              }),
            ],
          }),
        }),
      ],
    });
  };
}
