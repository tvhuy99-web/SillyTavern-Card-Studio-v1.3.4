export const REDACTED_VALUE = '[REDACTED]';

const SENSITIVE_HEADER_PATTERN = /^(?:authorization|proxy-authorization|x-api-key|api-key|x-goog-api-key|cookie|set-cookie)$/i;
const SENSITIVE_KEY_PATTERN = /^(?:authorization|proxyAuthorization|apiKey|api_key|x-api-key|x-goog-api-key|accessToken|access_token|refreshToken|refresh_token|clientSecret|client_secret|privateKey|private_key|password|proxyPassword|token|secret)$/i;
const SENSITIVE_QUERY_PATTERN = /^(?:key|api_key|apiKey|x-api-key|access_token|refresh_token|client_secret|authorization|password|token|secret)$/i;
const SENSITIVE_URL_FALLBACK_PATTERN = /([?&](?:key|api_key|apiKey|x-api-key|access_token|refresh_token|client_secret|authorization|password|token|secret)=)[^&#\s]*/gi;
const SENSITIVE_BODY_TEXT_PATTERN = /((?:^|[?&\s])(?:api_key|apiKey|x-api-key|access_token|refresh_token|client_secret|authorization|password|token|secret)=)[^&\s]*/gi;

const MAX_REDACT_DEPTH = 12;
const MAX_REDACT_ITEMS = 10000;

function readHeaderEntries(headers) {
  if (!headers) return [];
  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    return [...headers.entries()];
  }
  if (Array.isArray(headers)) {
    return headers;
  }
  if (typeof headers === 'object') {
    return Object.entries(headers);
  }
  return [];
}

export function redactHeaders(headers = {}) {
  const redacted = {};
  for (const [key, value] of readHeaderEntries(headers)) {
    redacted[key] = SENSITIVE_HEADER_PATTERN.test(key) ? REDACTED_VALUE : value;
  }
  return redacted;
}

export function redactUrl(url) {
  const rawUrl = String(url ?? '');
  try {
    const baseOrigin = typeof window !== 'undefined' && window?.location?.origin
      ? window.location.origin
      : 'https://local.invalid';
    const parsed = new URL(rawUrl, baseOrigin);
    if (parsed.username) parsed.username = 'REDACTED';
    if (parsed.password) parsed.password = 'REDACTED';
    for (const key of [...parsed.searchParams.keys()]) {
      if (SENSITIVE_QUERY_PATTERN.test(key)) {
        parsed.searchParams.set(key, REDACTED_VALUE);
      }
    }
    return /^[a-z][a-z\d+.-]*:/i.test(rawUrl)
      ? parsed.toString()
      : `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return rawUrl.replace(SENSITIVE_URL_FALLBACK_PATTERN, `$1${REDACTED_VALUE}`);
  }
}

function redactValue(value, depth = 0, seen = new WeakSet()) {
  if (typeof value !== 'object' || value === null) return value;
  if (depth >= MAX_REDACT_DEPTH) return '[TRUNCATED]';
  if (seen.has(value)) return '[CIRCULAR]';
  seen.add(value);
  if (Array.isArray(value)) {
    return value.slice(0, MAX_REDACT_ITEMS).map(item => redactValue(item, depth + 1, seen));
  }
  const redacted = {};
  for (const [key, entryValue] of Object.entries(value).slice(0, MAX_REDACT_ITEMS)) {
    redacted[key] = SENSITIVE_KEY_PATTERN.test(key)
      ? REDACTED_VALUE
      : redactValue(entryValue, depth + 1, seen);
  }
  return redacted;
}

export function redactBody(body) {
  if (typeof body !== 'string') return redactValue(body);
  const trimmed = body.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      return JSON.stringify(redactValue(JSON.parse(body)));
    } catch {}
  }
  return body.replace(SENSITIVE_BODY_TEXT_PATTERN, `$1${REDACTED_VALUE}`);
}

export function redactNetworkLog(entry = {}) {
  return {
    ...entry,
    url: redactUrl(String(entry.url || '')),
    headers: redactHeaders(entry.headers),
    body: redactBody(entry.body),
  };
}
