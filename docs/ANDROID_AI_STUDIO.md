# Android APK: stable debug signature + Google / AI Studio text source

## 1. Stable install-over updates

The Android GitHub Actions workflow decodes
`.github/signing/stable-debug.keystore.b64`, a copy of the public development
certificate from GeminiLiveTranslate. It injects a Gradle `stableDebug` signing
configuration into Capacitor's generated Android project. CI verifies the APK
with `apksigner` and compares the certificate SHA-256 against:

`85e27156c4557de4f35b6ebe771dd426f108182894219ff3b6dbed607a230c95`

The package ID remains `com.tvhuy99.cardstudio`. Each CI run sets an
increasing `versionCode = 10000 + GITHUB_RUN_NUMBER`.

This is a **publicly known debug key**, not suitable for a real Play Store or
security-sensitive release. Anyone can read it in the public repository. A
private production keystore must be kept in GitHub Secrets or a secure release
signing system.

**Migration:** The first Card Studio APK from the earlier random debug signing
setup has a different certificate. Android cannot install this stable-signed
APK over that copy; back up chat/cards and uninstall once. Subsequent APKs built
with the same package name + debug certificate + increasing version code can
install over one another.

## 2. Fourth provider: Google Account / AI Studio (Android only)

The existing Gemini API Key, OpenRouter, and Proxy providers are unchanged.

This optional provider uses the same **embedded AI Studio WebView session**
architecture as GeminiLiveTranslate. Card Studio now has a separate native
Capacitor plugin named `AIStudioText`. Its WebView loads the Google AI Studio
chat page. Users open it via **Cài đặt → Google / AI Studio → Mở Google /
AI Studio**, sign in, and select a model there. The session remains in that
WebView. The Card Studio text provider sends the prompt through the website's
visible text-entry controls and tries to read only the returned text response.
It does **not** use an API key, extract Google cookies/tokens, or transmit audio
or video.

**Important limitations:**

- This is an **experimental browser-UI automation**, not an officially supported
  Google Gemini text API and not a proof that Google account-based generation
  works. Google may block embedded-WebView sign-in; the user may see an
  authentication error. Do not attempt to bypass that block.
- The reference app implemented Live audio input and text *transcriptions*;
  it did **not** implement a standalone text prompt sender. This repo adds
  that missing piece and therefore cannot claim byte-for-byte behavior
  identical to the audio pipeline.
- AI Studio may change its DOM at any time, requiring updated selectors.
  Model selection happens on the AI Studio page itself, not over an official
  model-selection endpoint.
- Without a live authenticated Android device we cannot verify prompt
  submission or response extraction; CI only confirms app compilation and
  signing. No silent fallback to a different provider is used.
- Text is delivered as one completed response, not fake SSE token streaming.
- The provider is Android-only. Browser/Netlify builds will show an error if
  selected rather than pretending to authenticate.

## 3. Android test checklist

1. Back up data from the previous debug APK, then migrate once if Android
   reports an inconsistent signing certificate.
2. Install the latest stable-debug APK.
3. Open **Cài đặt**, select **Tài khoản Google / AI Studio**, press the new
   login/session button, then confirm the browser loads the AI Studio page.
4. If Google blocks WebView login, record the exact error; do not try to enter
   credentials on a spoofed page.
5. If authenticated, choose the model in AI Studio and return to Card Studio.
6. Send a short text prompt in a test character chat.
7. Verify a nonempty answer is returned, and that no audio/video permission
   is requested. Try cancel and timeout behavior.
8. Verify chat history is retained after app restarts and new signed APKs can
   install as an update without wiping app data.

Do not claim feature completion until step 6 works on an actual Android phone.


## 4. Detailed System Console diagnostics (text-only, R2)

The AI Studio native bridge emits structured, privacy-redacted diagnostics into
**Trò chuyện → Bảng điều khiển Hệ thống (Console) → AI Studio**. The UI now
retains 300 system entries rather than only the most recent message. A separate
ring of 250 AI Studio events is preserved in localStorage across app restarts.
The **Sao chép log** and **Xuất báo cáo lỗi** buttons include these events,
with their structured fields and request IDs.

Diagnostic phases:
- SESSION_CREATE / PAGE_STARTED / PAGE_FINISHED / PAGE_UI
- SESSION_VISIBLE / WEBVIEW_RETAIN (WebView stays attached behind Card Studio)
- REQUEST_START / JS_BOOTSTRAP / EDITOR_SNAPSHOT / EDITOR_FILLED
- SUBMIT_SNAPSHOT / SUBMIT_CLICKED (click is *not* a server acknowledgement)
- POLL_HEARTBEAT / WAITING / RESPONSE_PROGRESS / RESPONSE_COMPLETE
- REQUEST_FAILED / MAIN_FRAME_ERROR / HTTP_ERROR / SSL_ERROR / PAGE_JS_ERROR

Each log includes a request ID, local timestamp, UI state, element counts,
response length (never response text), stage and relevant elapsed time.
The diagnostic snapshot probes the DOM, including open shadow roots. Failed
requests distinguish missing editors, missing Run button, missing response
selectors, non-completion, Google auth, SSL, HTTP and webpage-JS problems.
The Android adapter emits incremental, actually observed text chunks while
generation proceeds and supports cancellation. This UI-observed streaming
is not guaranteed to match official Gemini API token streaming.

### What to send when chat fails

1. Open **Bảng điều khiển Hệ thống (Console)** in the Card Studio chat.
2. Select the **AI Studio** filter.
3. Press **Sao chép log** (or **Xuất báo cáo lỗi**).
4. Paste the report into ChatGPT. **Do not** share passwords, cookies or
   complete prompt/response content; the new logger deliberately excludes them.
5. If the logs show PAGE_UI with no editor or Run button, inspect the AI Studio
   login window. Google may deny embedded WebView authentication. Do not
   circumvent that restriction.

Reference inspiration: GeminiLiveTranslate's AppLogRepository and
AiStudioWebSessionExecutor, especially staged lifecycle checkpoints, partial
text callbacks, and diagnostic snapshots. Its video-description modes still
require an attachment workflow; removing video input does not turn them into
a public text API. The Card Studio implementation therefore keeps the
browser-session approach but implements a separate text-only UI route.


## 5. Automatic first-use initialization and JSON diagnostics (R3)

When Card Studio sends text to Google / AI Studio without a native WebView
session, it now initializes the real first-party site automatically and
opens its login/model-selection window. The original chat request waits for
the user to finish login and close the window, then attempts to send the
prompt. There is no need to open Settings manually first. Google can refuse
embedded WebView login; do not bypass such restrictions.

A 65,956-character Card Studio conversation prompt previously resulted in
\`AI_STUDIO_EDITOR_JS: JSONException\` before pressing Run. The WebView could
have returned null from a JavaScript error, navigation, or large inline
evaluation. This is not evidence of a Google-side error. R3 implements:

- 2,000-UTF16-unit prompt transfer chunks with length acknowledgements.
- A guarded JavaScript return envelope to distinguish JS exception, null
  evaluation, non-JSON reply, and missing response object.
- Console phases \`SESSION_AUTO_START\`, \`WAIT_FOR_LOGIN\`, \`SESSION_READY\`,
  \`INPUT_TRANSFER_COMPLETE\`, \`EDITOR_PARSE\`, \`EDITOR_NO_RESULT\`, etc.
- A provider-specific streaming watchdog that permits initial account login
  without stopping after the generic 120-second first-chunk timeout.

Logging never captures raw chat prompts, AI responses, authentication tokens,
cookies, or passwords. If the new version fails, use the **AI Studio** filter
and **Xuất báo cáo lỗi** to identify the exact failed phase.
