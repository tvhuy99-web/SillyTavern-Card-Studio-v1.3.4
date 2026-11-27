export function createToastProvider(getDependencies) {
  return function ToastProvider({
    children: children
  }) {
    const {
      react,
      toastContext,
      ToastNotification,
      jsxRuntime
    } = getDependencies();
    let [toasts, setToasts] = (0, react.useState)([]);
    let showToast = (0, react.useCallback)((message, type = "info") => {
      let toastId = Math.random().toString(36).substr(2, 9);
      setToasts(previous => [...previous, {
        id: toastId,
        type: type,
        message: message
      }]);
    }, []);
    let dismissToast = (0, react.useCallback)(toastId => {
      setToasts(previous => previous.filter(toast => toast.id !== toastId));
    }, []);
    (0, react.useEffect)(() => {
      let handleToastEvent = event => {
        let detail = event.detail;
        if (!detail) return;
        let message = String(detail.message ?? "").slice(0, 2e4);
        if (!message.trim()) return;
        let type = String(detail.type ?? "info");
        showToast(message, ["info", "success", "warning", "error"].includes(type) ? type : "info");
      };
      window.addEventListener("toast", handleToastEvent);
      window.addEventListener("sillytavern:show-toast", handleToastEvent);
      return () => {
        window.removeEventListener("toast", handleToastEvent);
        window.removeEventListener("sillytavern:show-toast", handleToastEvent);
      };
    }, [showToast]);
    return (0, jsxRuntime.jsxs)(toastContext.Provider, {
      value: {
        showToast: showToast
      },
      children: [children, (0, jsxRuntime.jsx)("div", {
        className: "fixed top-20 right-4 z-[100] flex flex-col items-end pointer-events-none",
        children: (0, jsxRuntime.jsx)("div", {
          className: "pointer-events-auto",
          children: toasts.map(toast => (0, jsxRuntime.jsx)(ToastNotification, {
            toast: toast,
            onClose: dismissToast
          }, toast.id))
        })
      })]
    });
  };
}
export function createSpeechProvider(getDependencies) {
  return function SpeechProvider({
    children: children
  }) {
    const {
      settingsStorage = globalThis.localStorage,
      stopNativeSpeech,
      speechContext,
      generateGeminiSpeech,
      speakNativeText,
      react,
      useToast,
      speechSettingsKey,
      speechDefaults,
      jsxRuntime
    } = getDependencies();
    let [settings, setSettings] = (0, react.useState)((() => {
      try {
        let serialized = localStorage.getItem(speechSettingsKey);
        if (serialized) {
          let savedSettings = JSON.parse(serialized);
          return {
            ...speechDefaults,
            ...savedSettings
          };
        }
      } catch (error) {
        console.error("Failed to load global TTS settings", error);
      }
      return speechDefaults;
    })());
    let updateSettings = (0, react.useCallback)(nextSettings => {
      settingsStorage.setItem(speechSettingsKey, JSON.stringify(nextSettings));
      setSettings(nextSettings);
    }, []);
    let [queue, setQueue] = (0, react.useState)([]);
    let [isPlaying, setIsPlaying] = (0, react.useState)(false);
    let [isPaused, setIsPaused] = (0, react.useState)(false);
    let [autoPlayEnabled, setAutoPlayEnabled] = (0, react.useState)(false);
    let [currentPlayingId, setCurrentPlayingId] = (0, react.useState)(null);
    let [isLoading, setIsLoading] = (0, react.useState)(false);
    let audioContextRef = (0, react.useRef)(null);
    let audioSourceRef = (0, react.useRef)(null);
    let generationRef = (0, react.useRef)(0);
    let {
      showToast: showToast
    } = useToast();
    (0, react.useEffect)(() => {
      let unlockAudio = async () => {
        if (typeof window.SpeechSynthesisUtterance !== "function" || !window.speechSynthesis) {
          document.removeEventListener("click", unlockAudio);
          document.removeEventListener("touchstart", unlockAudio);
          return;
        }
        let silentUtterance = new SpeechSynthesisUtterance("");
        silentUtterance.volume = 0;
        window.speechSynthesis.speak(silentUtterance);
        audioContextRef.current ||= new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: 24e3
        });
        "suspended" === audioContextRef.current.state && (await audioContextRef.current.resume());
        document.removeEventListener("click", unlockAudio);
        document.removeEventListener("touchstart", unlockAudio);
      };
      document.addEventListener("click", unlockAudio);
      document.addEventListener("touchstart", unlockAudio);
      return () => {
        document.removeEventListener("click", unlockAudio);
        document.removeEventListener("touchstart", unlockAudio);
        generationRef.current++;
        stopNativeSpeech();
        try {
          audioSourceRef.current?.stop();
        } catch {}
        audioContextRef.current?.close().catch(() => {});
      };
    }, []);
    let ensureAudioContext = (0, react.useCallback)(async () => {
      audioContextRef.current ||= new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 24e3
      });
      "suspended" === audioContextRef.current.state && (await audioContextRef.current.resume());
      return audioContextRef.current;
    }, []);
    let playBuffer = (0, react.useCallback)(async (buffer, messageId) => {
      let context = await ensureAudioContext();
      if (audioSourceRef.current) try {
        audioSourceRef.current.stop();
      } catch {}
      let source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      source.onended = () => {
        audioSourceRef.current === source && (setIsPlaying(false), setCurrentPlayingId(null), audioSourceRef.current = null);
      };
      audioSourceRef.current = source;
      source.start();
      setIsPlaying(true);
      setCurrentPlayingId(messageId);
    }, [ensureAudioContext]);
    (0, react.useEffect)(() => {
      (async () => {
        if (isPlaying || isPaused || isLoading || 0 === queue.length) return;
        let item = queue[0];
        let generation = generationRef.current;
        setIsLoading(true);
        try {
          if ("native" === item.provider) return setIsPlaying(true), setCurrentPlayingId(item.id), setIsLoading(false), void speakNativeText(item.text, item.voice, item.rate, item.pitch, () => {}, () => {
            generation === generationRef.current && (setIsPlaying(false), setCurrentPlayingId(null), setQueue(previous => previous.slice(1)));
          });
          if (item.audioPromise) {
            let buffer = await item.audioPromise;
            if (generation !== generationRef.current) return;
            setQueue(previous => previous.slice(1));
            await playBuffer(buffer, item.id);
          }
        } catch (error) {
          console.error("TTS Queue Error:", error);
          showToast(`Lỗi đọc: ${error instanceof Error ? error.message : String(error)}`, "error");
          setQueue(previous => previous.slice(1));
        } finally {
          "native" !== item.provider && setIsLoading(false);
        }
      })();
    }, [queue, isPlaying, isPaused, isLoading, playBuffer, showToast]);
    let addToQueue = (0, react.useCallback)((text, voice, messageId = `msg-${Date.now()}`, options = {}) => {
      let audioPromise;
      let provider = options.provider || settings.tts_provider;
      let selectedVoice = voice || ("native" === provider ? settings.tts_native_voice : settings.tts_voice);
      let rate = undefined === options.rate ? settings.tts_rate : options.rate;
      let pitch = undefined === options.pitch ? settings.tts_pitch : options.pitch;
      "gemini" === provider && (audioPromise = generateGeminiSpeech(text, selectedVoice));
      let item = {
        id: messageId,
        text: text,
        voice: selectedVoice,
        audioPromise: audioPromise,
        provider: provider,
        rate: rate,
        pitch: pitch
      };
      setQueue(previous => [...previous, item]);
    }, [settings]);
    let playImmediately = (0, react.useCallback)(async (text, voice, messageId = `now-${Date.now()}`, options = {}) => {
      let generation = ++generationRef.current;
      let provider = options.provider || settings.tts_provider;
      let selectedVoice = voice || ("native" === provider ? settings.tts_native_voice : settings.tts_voice);
      let rate = undefined === options.rate ? settings.tts_rate : options.rate;
      let pitch = undefined === options.pitch ? settings.tts_pitch : options.pitch;
      if (setQueue([]), audioSourceRef.current) try {
        audioSourceRef.current.stop();
      } catch {}
      if (stopNativeSpeech(), setIsPaused(false), "native" === provider) {
        setIsPlaying(true);
        setCurrentPlayingId(messageId);
        setIsLoading(false);
        speakNativeText(text, selectedVoice, rate, pitch, () => {}, () => {
          generation === generationRef.current && (setIsPlaying(false), setCurrentPlayingId(null));
        });
      } else {
        setIsLoading(true);
        setCurrentPlayingId(messageId);
        setIsPlaying(false);
        try {
          let context = await ensureAudioContext();
          "suspended" === context.state && (await context.resume());
          let buffer = await generateGeminiSpeech(text, selectedVoice);
          if (generation !== generationRef.current) return;
          setIsLoading(false);
          await playBuffer(buffer, messageId);
        } catch (error) {
          if (generation !== generationRef.current) return;
          console.error("TTS Immediate Error:", error);
          showToast(`Lỗi đọc: ${error instanceof Error ? error.message : String(error)}`, "error");
          setIsLoading(false);
          setCurrentPlayingId(null);
          setIsPlaying(false);
        }
      }
    }, [settings, ensureAudioContext, playBuffer, showToast]);
    let togglePause = (0, react.useCallback)(async () => {
      let context = await ensureAudioContext();
      if (isPaused) {
        "suspended" === context.state && (await context.resume());
        window.speechSynthesis.paused && window.speechSynthesis.resume();
        setIsPaused(false);
      } else {
        "running" === context.state && (await context.suspend());
        window.speechSynthesis.speaking && window.speechSynthesis.pause();
        setIsPaused(true);
      }
    }, [ensureAudioContext, isPaused]);
    let skip = (0, react.useCallback)(() => {
      if (generationRef.current++, stopNativeSpeech(), audioSourceRef.current) try {
        audioSourceRef.current.stop();
      } catch {} else isLoading && queue.length > 0 && (setQueue(previous => previous.slice(1)), setIsLoading(false));
    }, [isLoading, queue.length]);
    let stopAll = (0, react.useCallback)(() => {
      if (generationRef.current++, setQueue([]), stopNativeSpeech(), audioSourceRef.current) try {
        audioSourceRef.current.stop();
      } catch {}
      setIsPlaying(false);
      setIsPaused(false);
      setIsLoading(false);
    }, []);
    let toggleAutoPlay = (0, react.useCallback)(() => {
      setAutoPlayEnabled(previous => !previous);
    }, []);
    return (0, jsxRuntime.jsx)(speechContext.Provider, {
      value: {
        isPlaying: isPlaying,
        isPaused: isPaused,
        autoPlayEnabled: autoPlayEnabled,
        queue: queue,
        currentPlayingId: currentPlayingId,
        isLoading: isLoading,
        settings: settings,
        updateSettings: updateSettings,
        addToQueue: addToQueue,
        playImmediately: playImmediately,
        toggleAutoPlay: toggleAutoPlay,
        togglePause: togglePause,
        skip: skip,
        stopAll: stopAll
      },
      children: children
    });
  };
}
export function createCardPopupProvider(getDependencies) {
  return function CardPopupProvider({
    children: children
  }) {
    const {
      cardPopupContext,
      useDialogFocus,
      htmlSanitizer,
      react,
      jsxRuntime
    } = getDependencies();
    let [isOpen, setIsOpen] = (0, react.useState)(false);
    let [html, setHtml] = (0, react.useState)("");
    let [title, setTitle] = (0, react.useState)("");
    let dialogRef = (0, react.useRef)(null);
    let closeButtonRef = (0, react.useRef)(null);
    let showPopup = (0, react.useCallback)((content, popupTitle = "Thông báo Thẻ") => {
      let sanitizedHtml = htmlSanitizer.sanitize(content, {
        ADD_TAGS: ["img", "div", "span", "p", "br", "b", "i", "strong", "em", "table", "tr", "td", "th", "tbody", "thead", "ul", "ol", "li", "h1", "h2", "h3", "h4", "hr"],
        ADD_ATTR: ["class", "src", "width", "height", "align", "border", "cellpadding", "cellspacing"],
        FORBID_TAGS: ["style", "script", "iframe", "object", "embed"],
        FORBID_ATTR: ["style", "srcdoc"]
      });
      setHtml(sanitizedHtml);
      setTitle(popupTitle);
      setIsOpen(true);
    }, []);
    let closePopup = (0, react.useCallback)(() => {
      setIsOpen(false);
      setHtml("");
    }, []);
    useDialogFocus(isOpen, closePopup, dialogRef, closeButtonRef);
    (0, react.useEffect)(() => {
      let handlePopupEvent = event => {
        let detail = event.detail;
        if (!detail) return;
        let content = String(detail.content ?? "").slice(0, 5e5);
        if (!content.trim()) return;
        let popupTitle = String(detail.title ?? "Thông báo Thẻ").slice(0, 120);
        showPopup(content, popupTitle);
      };
      window.addEventListener("sillytavern:show-popup", handlePopupEvent);
      return () => window.removeEventListener("sillytavern:show-popup", handlePopupEvent);
    }, [showPopup]);
    return (0, jsxRuntime.jsxs)(cardPopupContext.Provider, {
      value: {
        showPopup: showPopup,
        closePopup: closePopup
      },
      children: [children, isOpen && (0, jsxRuntime.jsx)("div", {
        className: "fixed inset-0 bg-black/70  flex items-center justify-center z-[100] p-4",
        onClick: closePopup,
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": "card-popup-title",
        children: (0, jsxRuntime.jsxs)("div", {
          ref: dialogRef,
          className: "bg-slate-800 border border-slate-600 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden ",
          onClick: event => event.stopPropagation(),
          children: [(0, jsxRuntime.jsxs)("div", {
            className: "flex justify-between items-center p-4 border-b border-slate-700 bg-slate-900/50",
            children: [(0, jsxRuntime.jsx)("h3", {
              id: "card-popup-title",
              className: "text-lg font-bold text-sky-400",
              children: title
            }), (0, jsxRuntime.jsx)("button", {
              ref: closeButtonRef,
              onClick: closePopup,
              className: "text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700 ",
              "aria-label": "Đóng popup",
              children: (0, jsxRuntime.jsx)("svg", {
                "aria-hidden": "true",
                xmlns: "http://www.w3.org/2000/svg",
                className: "h-6 w-6",
                fill: "none",
                viewBox: "0 0 24 24",
                stroke: "currentColor",
                children: (0, jsxRuntime.jsx)("path", {
                  strokeLinecap: "round",
                  strokeLinejoin: "round",
                  strokeWidth: "2",
                  d: "M6 18L18 6M6 6l12 12"
                })
              })
            })]
          }), (0, jsxRuntime.jsx)("div", {
            className: "p-6 overflow-y-auto custom-scrollbar bg-slate-800 text-slate-200 popup-content",
            children: (0, jsxRuntime.jsx)("div", {
              dangerouslySetInnerHTML: {
                __html: html
              }
            })
          }), (0, jsxRuntime.jsx)("div", {
            className: "p-3 border-t border-slate-700 bg-slate-900/30 flex justify-end",
            children: (0, jsxRuntime.jsx)("button", {
              onClick: closePopup,
              className: "px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium ",
              children: "Đóng"
            })
          })]
        })
      }), (0, jsxRuntime.jsx)("style", {
        children: "\n        .popup-content table { width: 100%; border-collapse: collapse; margin-bottom: 1em; }\n        .popup-content th, .popup-content td { border: 1px solid #475569; padding: 8px; }\n        .popup-content th { background-color: #1e293b; color: #e2e8f0; }\n        .popup-content img { max-width: 100%; height: auto; border-radius: 4px; }\n      "
      })]
    });
  };
}