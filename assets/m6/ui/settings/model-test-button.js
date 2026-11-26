import { awaitAbortable } from '../../../m4/core/async/cancellation.js';

export function buildProbeTarget({ provider, model, useDefaultGeminiKey, geminiKeysText, openRouterKey, proxy, connections }) {
  const target = { provider, model: String(model ?? '').trim() };
  if (provider === 'gemini') {
    target.geminiApiKey = useDefaultGeminiKey ? connections.getGeminiCatalogKeyForEnvironment() : String(geminiKeysText ?? '').split(/\r?\n/).map(value => value.trim()).find(Boolean) || '';
    if (!target.geminiApiKey) target.unavailable = useDefaultGeminiKey ? 'Không tìm thấy API Key Gemini mặc định.' : 'API Key Gemini chưa được nhập.';
  } else if (provider === 'openrouter') {
    target.openRouterApiKey = String(openRouterKey ?? '').trim();
    if (!target.openRouterApiKey) target.unavailable = 'API Key OpenRouter chưa được nhập.';
  } else if (provider === 'proxy') {
    target.proxy = { url: String(proxy?.url ?? '').trim(), password: String(proxy?.password ?? '').trim(), legacyMode: Boolean(proxy?.legacyMode), protocol: proxy?.protocol || 'openai' };
    if (!target.proxy.url) target.unavailable = 'Chưa cấu hình Proxy URL.';
  } else if (provider === 'aistudio') {
    target.unavailable = 'AI Studio chưa hỗ trợ kiểm tra model độc lập an toàn. Hãy mở phiên AI Studio để kiểm tra.';
  }
  return target;
}

export function buildSavedProbeTarget({ provider, model, profileId, connections, proxyPersistence, proxy } = {}) {
  const settings = connections?.getSettings?.() || {};
  const resolvedProvider = provider || settings.source || 'gemini';
  if (resolvedProvider === 'gemini') {
    const gemini = connections?.getGemini?.() || { useDefault: true, keys: [] };
    return buildProbeTarget({
      provider: 'gemini',
      model,
      useDefaultGeminiKey: Boolean(gemini.useDefault),
      geminiKeysText: Array.isArray(gemini.keys) ? gemini.keys.join('\n') : '',
      connections,
    });
  }
  if (resolvedProvider === 'openrouter') {
    return buildProbeTarget({
      provider: 'openrouter',
      model,
      openRouterKey: connections?.getOpenRouterKey?.() || '',
      connections,
    });
  }
  if (resolvedProvider === 'proxy') {
    const resolvedProfileId = String((profileId === undefined ? settings.proxy_profile_id : profileId) ?? '').trim();
    const profiles = proxyPersistence?.getProfiles?.() || [];
    const profile = resolvedProfileId ? profiles.find(item => String(item.id) === resolvedProfileId) || null : null;
    if (resolvedProfileId && !profile) {
      return { provider: 'proxy', model: String(model ?? '').trim(), unavailable: 'Cấu hình Proxy không còn tồn tại.' };
    }
    const savedProxy = profile || proxy || {
      url: settings.proxy_url || 'http://127.0.0.1:8889',
      password: proxyPersistence?.getPassword?.() || '',
      legacyMode: settings.proxy_legacy_mode !== false,
      protocol: settings.proxy_protocol || 'openai',
    };
    const target = buildProbeTarget({ provider: 'proxy', model, proxy: savedProxy, connections });
    if (resolvedProfileId) target.proxy = { ...target.proxy, profileId: resolvedProfileId };
    return target;
  }
  return buildProbeTarget({ provider: resolvedProvider, model, connections });
}

export function safeProbeError(error, target) {
  let message = String(error?.message || error || 'Lỗi không xác định');
  for (const secret of [target.geminiApiKey, target.openRouterApiKey, target.proxy?.password]) {
    if (secret) message = message.split(secret).join('[REDACTED]');
  }
  return message.replace(/Bearer\s+\S+|AIza[\w-]{15,}|(?:api[_-]?key|access_token|authorization)=\S+/gi, '[REDACTED]').slice(0, 180);
}

export async function runModelProbe(testModel, target, signal) {
  if (target.unavailable) throw Error(target.unavailable);
  if (!target.model) throw Error('Hãy chọn hoặc nhập Model ID trước khi kiểm tra.');
  if (typeof testModel !== 'function') throw Error('Bộ kiểm tra model chưa sẵn sàng.');
  return awaitAbortable(() => testModel({ provider: target.provider, model: target.model, geminiApiKey: target.geminiApiKey, openRouterApiKey: target.openRouterApiKey, proxy: target.proxy, signal }), signal);
}

const initialStatus = { kind: 'idle', text: 'Kiểm tra', title: 'Kiểm tra model đang chọn bằng một yêu cầu tạo nội dung tối thiểu' };
export function createModelTestButton({ jsx }, { useState, useRef, useEffect }) {
  return function ModelTestButton({ target, testModel, notify }) {
    const [status, setStatus] = useState(initialStatus);
    const pending = useRef(null);
    const identity = JSON.stringify(target);
    const current = useRef(identity);
    current.current = identity;
    useEffect(() => {
      setStatus(initialStatus);
      return () => { pending.current?.abort(); pending.current = null; };
    }, [identity]);
    async function handleClick() {
      if (pending.current) return;
      const controller = new AbortController();
      pending.current = controller;
      let timeout = false;
      const timer = setTimeout(() => { timeout = true; controller.abort(); }, 20000);
      const stillCurrent = () => current.current === identity && pending.current === controller;
      setStatus({ kind: 'testing', text: 'Đang kiểm tra…', title: `${target.provider} · ${target.model}` });
      try {
        const result = await runModelProbe(testModel, target, controller.signal);
        if (!stillCurrent()) return;
        const latency = Math.max(0, Math.round(result?.latencyMs || 0));
        setStatus({ kind: 'success', text: '✓ Hoạt động', title: `${target.provider} · ${target.model} · ${latency} ms` });
        notify?.(`Model “${target.model}” hoạt động${latency ? ` · ${latency} ms` : ''}.`, 'success');
      } catch (error) {
        if (!stillCurrent()) return;
        const message = timeout ? 'Kết nối quá thời gian.' : safeProbeError(error, target);
        setStatus({ kind: 'error', text: '✕ Lỗi', title: message });
        notify?.(`Kiểm tra model thất bại: ${message}`, 'error');
      } finally {
        clearTimeout(timer);
        if (pending.current === controller) pending.current = null;
      }
    }
    const disabled = status.kind === 'testing' || target.provider === 'aistudio';
    return jsx('button', { type: 'button', className: 'sts-model-test-button', 'aria-live': 'polite', 'data-state': status.kind, disabled, title: target.provider === 'aistudio' ? target.unavailable : status.title, onClick: handleClick, children: status.text });
  };
}
