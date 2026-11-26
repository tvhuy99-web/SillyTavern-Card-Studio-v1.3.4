// Recovered application UI. The existing React instance and feature dependencies are injected.
// Keep the factory boundary until the native React build replaces the recovered host.

export function createToastProvider(getDependencies) {
  return function ToastProvider({
    children: e
  }) {
    const {
      b,
      dl,
      pl,
      wt
    } = getDependencies();
    let [t, n] = (0, b.useState)([]);
    let r = (0, b.useCallback)((e, t = "info") => {
      let r = Math.random().toString(36).substr(2, 9);
      n(n => [...n, {
        id: r,
        type: t,
        message: e
      }]);
    }, []);
    let a = (0, b.useCallback)(e => {
      n(t => t.filter(t => t.id !== e));
    }, []);
    (0, b.useEffect)(() => {
      let e = e => {
        let t = e.detail;
        if (!t) return;
        let n = String(t.message ?? "").slice(0, 2e4);
        if (!n.trim()) return;
        let a = String(t.type ?? "info");
        r(n, ["info", "success", "warning", "error"].includes(a) ? a : "info");
      };
      window.addEventListener("toast", e);
      window.addEventListener("sillytavern:show-toast", e);
      return () => {
        window.removeEventListener("toast", e);
        window.removeEventListener("sillytavern:show-toast", e);
      };
    }, [r]);
    return (0, wt.jsxs)(dl.Provider, {
      value: {
        showToast: r
      },
      children: [e, (0, wt.jsx)("div", {
        className: "fixed top-20 right-4 z-[100] flex flex-col items-end pointer-events-none",
        children: (0, wt.jsx)("div", {
          className: "pointer-events-auto",
          children: t.map(e => (0, wt.jsx)(pl, {
            toast: e,
            onClose: a
          }, e.id))
        })
      })]
    });
  };
}
export function createSpeechProvider(getDependencies) {
  return function SpeechProvider({
    children: e
  }) {
    const {
      settingsStorage = globalThis.localStorage,
      Bd,
      Gd,
      Ld,
      Ud,
      b,
      hl,
      qo,
      ts,
      wt
    } = getDependencies();
    let [t, n] = (0, b.useState)((() => {
      try {
        let e = localStorage.getItem(qo);
        if (e) {
          let t = JSON.parse(e);
          return {
            ...ts,
            ...t
          };
        }
      } catch (e) {
        console.error("Failed to load global TTS settings", e);
      }
      return ts;
    })());
    let r = (0, b.useCallback)(e => {
      settingsStorage.setItem(qo, JSON.stringify(e));
      n(e);
    }, []);
    let [a, i] = (0, b.useState)([]);
    let [o, s] = (0, b.useState)(false);
    let [l, c] = (0, b.useState)(false);
    let [u, d] = (0, b.useState)(false);
    let [h, p] = (0, b.useState)(null);
    let [m, g] = (0, b.useState)(false);
    let f = (0, b.useRef)(null);
    let y = (0, b.useRef)(null);
    let v = (0, b.useRef)(0);
    let {
      showToast: x
    } = hl();
    (0, b.useEffect)(() => {
      let e = async () => {
        if (typeof window.SpeechSynthesisUtterance !== "function" || !window.speechSynthesis) {
          document.removeEventListener("click", e);
          document.removeEventListener("touchstart", e);
          return;
        }
        let t = new SpeechSynthesisUtterance("");
        t.volume = 0;
        window.speechSynthesis.speak(t);
        f.current ||= new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: 24e3
        });
        "suspended" === f.current.state && (await f.current.resume());
        document.removeEventListener("click", e);
        document.removeEventListener("touchstart", e);
      };
      document.addEventListener("click", e);
      document.addEventListener("touchstart", e);
      return () => {
        document.removeEventListener("click", e);
        document.removeEventListener("touchstart", e);
        v.current++;
        Bd();
        try {
          y.current?.stop();
        } catch {}
        f.current?.close().catch(() => {});
      };
    }, []);
    let _ = (0, b.useCallback)(async () => {
      f.current ||= new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 24e3
      });
      "suspended" === f.current.state && (await f.current.resume());
      return f.current;
    }, []);
    let w = (0, b.useCallback)(async (e, t) => {
      let n = await _();
      if (y.current) try {
        y.current.stop();
      } catch {}
      let r = n.createBufferSource();
      r.buffer = e;
      r.connect(n.destination);
      r.onended = () => {
        y.current === r && (s(false), p(null), y.current = null);
      };
      y.current = r;
      r.start();
      s(true);
      p(t);
    }, [_]);
    (0, b.useEffect)(() => {
      (async () => {
        if (o || l || m || 0 === a.length) return;
        let e = a[0];
        let t = v.current;
        g(true);
        try {
          if ("native" === e.provider) return s(true), p(e.id), g(false), void Ud(e.text, e.voice, e.rate, e.pitch, () => {}, () => {
            t === v.current && (s(false), p(null), i(e => e.slice(1)));
          });
          if (e.audioPromise) {
            let n = await e.audioPromise;
            if (t !== v.current) return;
            i(e => e.slice(1));
            await w(n, e.id);
          }
        } catch (e) {
          console.error("TTS Queue Error:", e);
          x(`Lỗi đọc: ${e instanceof Error ? e.message : String(e)}`, "error");
          i(e => e.slice(1));
        } finally {
          "native" !== e.provider && g(false);
        }
      })();
    }, [a, o, l, m, w, x]);
    let k = (0, b.useCallback)((e, n, r = `msg-${Date.now()}`, a = {}) => {
      let o;
      let s = a.provider || t.tts_provider;
      let l = n || ("native" === s ? t.tts_native_voice : t.tts_voice);
      let c = undefined === a.rate ? t.tts_rate : a.rate;
      let u = undefined === a.pitch ? t.tts_pitch : a.pitch;
      "gemini" === s && (o = Ld(e, l));
      let d = {
        id: r,
        text: e,
        voice: l,
        audioPromise: o,
        provider: s,
        rate: c,
        pitch: u
      };
      i(e => [...e, d]);
    }, [t]);
    let S = (0, b.useCallback)(async (e, n, r = `now-${Date.now()}`, a = {}) => {
      let o = ++v.current;
      let l = a.provider || t.tts_provider;
      let u = n || ("native" === l ? t.tts_native_voice : t.tts_voice);
      let d = undefined === a.rate ? t.tts_rate : a.rate;
      let h = undefined === a.pitch ? t.tts_pitch : a.pitch;
      if (i([]), y.current) try {
        y.current.stop();
      } catch {}
      if (Bd(), c(false), "native" === l) {
        s(true);
        p(r);
        g(false);
        Ud(e, u, d, h, () => {}, () => {
          o === v.current && (s(false), p(null));
        });
      } else {
        g(true);
        p(r);
        s(false);
        try {
          let t = await _();
          "suspended" === t.state && (await t.resume());
          let n = await Ld(e, u);
          if (o !== v.current) return;
          g(false);
          await w(n, r);
        } catch (e) {
          if (o !== v.current) return;
          console.error("TTS Immediate Error:", e);
          x(`Lỗi đọc: ${e instanceof Error ? e.message : String(e)}`, "error");
          g(false);
          p(null);
          s(false);
        }
      }
    }, [t, _, w, x]);
    let C = (0, b.useCallback)(async () => {
      let e = await _();
      if (l) {
        "suspended" === e.state && (await e.resume());
        window.speechSynthesis.paused && window.speechSynthesis.resume();
        c(false);
      } else {
        "running" === e.state && (await e.suspend());
        window.speechSynthesis.speaking && window.speechSynthesis.pause();
        c(true);
      }
    }, [_, l]);
    let E = (0, b.useCallback)(() => {
      if (v.current++, Bd(), y.current) try {
        y.current.stop();
      } catch {} else m && a.length > 0 && (i(e => e.slice(1)), g(false));
    }, [m, a.length]);
    let N = (0, b.useCallback)(() => {
      if (v.current++, i([]), Bd(), y.current) try {
        y.current.stop();
      } catch {}
      s(false);
      c(false);
      g(false);
    }, []);
    let T = (0, b.useCallback)(() => {
      d(e => !e);
    }, []);
    return (0, wt.jsx)(Gd.Provider, {
      value: {
        isPlaying: o,
        isPaused: l,
        autoPlayEnabled: u,
        queue: a,
        currentPlayingId: h,
        isLoading: m,
        settings: t,
        updateSettings: r,
        addToQueue: k,
        playImmediately: S,
        toggleAutoPlay: T,
        togglePause: C,
        skip: E,
        stopAll: N
      },
      children: e
    });
  };
}
export function createCardPopupProvider(getDependencies) {
  return function CardPopupProvider({
    children: e
  }) {
    const {
      Xf,
      Xl,
      Yg,
      b,
      wt
    } = getDependencies();
    let [t, n] = (0, b.useState)(false);
    let [r, a] = (0, b.useState)("");
    let [i, o] = (0, b.useState)("");
    let s = (0, b.useRef)(null);
    let l = (0, b.useRef)(null);
    let c = (0, b.useCallback)((e, t = "Thông báo Thẻ") => {
      let r = Yg.sanitize(e, {
        ADD_TAGS: ["img", "div", "span", "p", "br", "b", "i", "strong", "em", "table", "tr", "td", "th", "tbody", "thead", "ul", "ol", "li", "h1", "h2", "h3", "h4", "hr"],
        ADD_ATTR: ["class", "src", "width", "height", "align", "border", "cellpadding", "cellspacing"],
        FORBID_TAGS: ["style", "script", "iframe", "object", "embed"],
        FORBID_ATTR: ["style", "srcdoc"]
      });
      a(r);
      o(t);
      n(true);
    }, []);
    let u = (0, b.useCallback)(() => {
      n(false);
      a("");
    }, []);
    Xl(t, u, s, l);
    (0, b.useEffect)(() => {
      let e = e => {
        let t = e.detail;
        if (!t) return;
        let n = String(t.content ?? "").slice(0, 5e5);
        if (!n.trim()) return;
        let r = String(t.title ?? "Thông báo Thẻ").slice(0, 120);
        c(n, r);
      };
      window.addEventListener("sillytavern:show-popup", e);
      return () => window.removeEventListener("sillytavern:show-popup", e);
    }, [c]);
    return (0, wt.jsxs)(Xf.Provider, {
      value: {
        showPopup: c,
        closePopup: u
      },
      children: [e, t && (0, wt.jsx)("div", {
        className: "fixed inset-0 bg-black/70  flex items-center justify-center z-[100] p-4",
        onClick: u,
        role: "dialog",
        "aria-modal": "true",
        "aria-labelledby": "card-popup-title",
        children: (0, wt.jsxs)("div", {
          ref: s,
          className: "bg-slate-800 border border-slate-600 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden ",
          onClick: e => e.stopPropagation(),
          children: [(0, wt.jsxs)("div", {
            className: "flex justify-between items-center p-4 border-b border-slate-700 bg-slate-900/50",
            children: [(0, wt.jsx)("h3", {
              id: "card-popup-title",
              className: "text-lg font-bold text-sky-400",
              children: i
            }), (0, wt.jsx)("button", {
              ref: l,
              onClick: u,
              className: "text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700 ",
              "aria-label": "Đóng popup",
              children: (0, wt.jsx)("svg", {
                "aria-hidden": "true",
                xmlns: "http://www.w3.org/2000/svg",
                className: "h-6 w-6",
                fill: "none",
                viewBox: "0 0 24 24",
                stroke: "currentColor",
                children: (0, wt.jsx)("path", {
                  strokeLinecap: "round",
                  strokeLinejoin: "round",
                  strokeWidth: "2",
                  d: "M6 18L18 6M6 6l12 12"
                })
              })
            })]
          }), (0, wt.jsx)("div", {
            className: "p-6 overflow-y-auto custom-scrollbar bg-slate-800 text-slate-200 popup-content",
            children: (0, wt.jsx)("div", {
              dangerouslySetInnerHTML: {
                __html: r
              }
            })
          }), (0, wt.jsx)("div", {
            className: "p-3 border-t border-slate-700 bg-slate-900/30 flex justify-end",
            children: (0, wt.jsx)("button", {
              onClick: u,
              className: "px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium ",
              children: "Đóng"
            })
          })]
        })
      }), (0, wt.jsx)("style", {
        children: "\n        .popup-content table { width: 100%; border-collapse: collapse; margin-bottom: 1em; }\n        .popup-content th, .popup-content td { border: 1px solid #475569; padding: 8px; }\n        .popup-content th { background-color: #1e293b; color: #e2e8f0; }\n        .popup-content img { max-width: 100%; height: auto; border-radius: 4px; }\n      "
      })]
    });
  };
}