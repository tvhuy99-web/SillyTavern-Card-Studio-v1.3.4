// Semantic dependency contract: callers inject named dependencies directly.
// Factories receive the existing React/runtime bindings lazily to preserve initialization order.

export function createEmbeddingProviderStatus(getDependencies) {
  return function EmbeddingProviderStatus({ providerId, showToast }) {
    const {
      embeddingService,
      react,
      jsxRuntime,
    } = getDependencies();

    const [providerStatus, setProviderStatus] = react.useState({
      status: 'checking',
      progress: 0,
    });
    const providerInfo = embeddingService.getProviderInfo(providerId);
    const isLocalProvider = providerInfo.kind === 'local';

    react.useEffect(() => {
      let cancelled = false;
      setProviderStatus({ status: 'checking', progress: 0 });
      embeddingService
        .getProviderStatus(providerId)
        .then(status => {
          if (!cancelled) {
            setProviderStatus(status);
          }
        })
        .catch(error => {
          if (!cancelled) {
            setProviderStatus({
              status: 'error',
              progress: 0,
              error: error?.message || String(error),
            });
          }
        });
      return () => {
        cancelled = true;
      };
    }, [providerId]);

    const handleDownloadModel = async () => {
      try {
        setProviderStatus({ status: 'loading', progress: 0 });
        await embeddingService.prepareProvider(providerId, progressEvent => {
          setProviderStatus({
            status: 'loading',
            progress: Math.max(0, Math.min(100, Number(progressEvent?.progress) || 0)),
          });
        });
        setProviderStatus(await embeddingService.getProviderStatus(providerId));
        showToast(`Mô hình ${providerInfo.shortLabel} đã sẵn sàng.`, 'success');
      } catch (error) {
        setProviderStatus({
          status: 'error',
          progress: 0,
          error: error?.message || String(error),
        });
        showToast(`Không thể tải mô hình: ${error?.message || error}`, 'error');
      }
    };

    const handleDeleteModel = async () => {
      try {
        await embeddingService.deleteProvider(providerId);
        setProviderStatus(await embeddingService.getProviderStatus(providerId));
        showToast(`Đã xóa ${providerInfo.shortLabel} khỏi bộ nhớ cục bộ.`, 'info');
      } catch (error) {
        showToast(`Không thể xóa mô hình: ${error?.message || error}`, 'error');
      }
    };

    if (!isLocalProvider) {
      return jsxRuntime.jsx('div', {
        className: 'bg-slate-900/50 border border-slate-700 rounded-lg p-3',
        children: jsxRuntime.jsxs('div', {
          className: 'flex items-center justify-between gap-3',
          children: [
            jsxRuntime.jsxs('div', {
              children: [
                jsxRuntime.jsx('div', {
                  className: 'text-sm font-bold text-sky-300',
                  children: providerInfo.shortLabel,
                }),
                jsxRuntime.jsx('div', {
                  className: 'text-xs text-slate-400 mt-1',
                  children: 'Online · sử dụng Gemini API đã cấu hình',
                }),
              ],
            }),
            jsxRuntime.jsx('span', {
              className: `text-xs font-bold ${
                providerStatus.status === 'ready' ? 'text-emerald-400' : 'text-amber-400'
              }`,
              children: providerStatus.status === 'ready' ? 'Sẵn sàng' : 'Chưa có API Key',
            }),
          ],
        }),
      });
    }

    let statusLabel = 'Chưa tải';
    if (providerStatus.status === 'ready') {
      statusLabel = 'Sẵn sàng';
    } else if (providerStatus.status === 'cached') {
      statusLabel = 'Đã tải · sẵn sàng';
    } else if (providerStatus.status === 'loading') {
      statusLabel = 'Đang tải...';
    } else if (providerStatus.status === 'error') {
      statusLabel = 'Lỗi';
    } else if (providerStatus.status === 'checking') {
      statusLabel = 'Đang kiểm tra...';
    }

    const statusToneClass = providerStatus.status === 'ready' || providerStatus.status === 'cached'
      ? 'text-emerald-400'
      : (providerStatus.status === 'error' ? 'text-red-400' : 'text-amber-400');

    return jsxRuntime.jsxs('div', {
      className: 'bg-slate-900/50 border border-slate-700 rounded-lg p-3 space-y-3',
      children: [
        jsxRuntime.jsxs('div', {
          className: 'flex items-start justify-between gap-3',
          children: [
            jsxRuntime.jsxs('div', {
              children: [
                jsxRuntime.jsx('div', {
                  className: 'text-sm font-bold text-sky-300',
                  children: providerInfo.shortLabel,
                }),
                jsxRuntime.jsxs('div', {
                  className: 'text-xs text-slate-400 mt-1',
                  children: [providerInfo.sizeLabel, ' · lưu trên thiết bị'],
                }),
              ],
            }),
            jsxRuntime.jsx('span', {
              className: `text-xs font-bold ${statusToneClass}`,
              children: statusLabel,
            }),
          ],
        }),
        providerStatus.status === 'loading' && jsxRuntime.jsxs('div', {
          className: 'space-y-1',
          children: [
            jsxRuntime.jsx('div', {
              className: 'h-2 bg-slate-800 rounded-full overflow-hidden',
              children: jsxRuntime.jsx('div', {
                className: 'h-full bg-sky-500',
                style: { width: `${providerStatus.progress || 0}%` },
              }),
            }),
            jsxRuntime.jsxs('div', {
              className: 'text-[11px] text-slate-400 text-right',
              children: [Math.round(providerStatus.progress || 0), '%'],
            }),
          ],
        }),
        providerStatus.error && jsxRuntime.jsx('div', {
          className: 'text-xs text-red-400',
          children: providerStatus.error,
        }),
        jsxRuntime.jsxs('div', {
          className: 'flex flex-wrap gap-2',
          children: [
            (providerStatus.status === 'missing' || providerStatus.status === 'error') && jsxRuntime.jsx('button', {
              type: 'button',
              onClick: handleDownloadModel,
              className: 'px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold',
              children: 'TẢI MÔ HÌNH',
            }),
            (providerStatus.status === 'cached' || providerStatus.status === 'ready') && jsxRuntime.jsx('button', {
              type: 'button',
              onClick: handleDeleteModel,
              className: 'px-3 py-2 rounded-lg bg-slate-700 hover:bg-red-700 text-slate-200 text-xs font-bold',
              children: 'XÓA MÔ HÌNH',
            }),
          ],
        }),
      ],
    });
  };
}
