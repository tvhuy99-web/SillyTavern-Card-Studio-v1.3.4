
export function createSpeechSettings(getDependencies) {
  return function SpeechSettings() {
    const {
      sanitizeSpeechText,
      SearchableSelect,
      geminiSpeechVoices,
      speechSafetySettings,
      getAudioContext,
      decodeRawPcmBuffer,
      decodeBase64Bytes,
      speakNativeText,
      react,
      useToast,
      NumberInput,
      useSpeech,
      GoogleGenAI,
      jsxRuntime,
      ToggleSwitch,
      nextGeminiKey,
      Modality
    } = getDependencies();
    let {
      settings: speechSettings,
      updateSettings: updateSpeechSettings
    } = useSpeech();
    let {
      showToast: showToast
    } = useToast();
    let [isTestingVoice, setIsTestingVoice] = (0, react.useState)(false);
    let [nativeVoices, setNativeVoices] = (0, react.useState)([]);
    (0, react.useEffect)(() => {
      let refreshVoices = () => {
        let voices = window.speechSynthesis.getVoices().sort((firstVoice, secondVoice) => {
          let firstVietnamese = firstVoice.lang.includes("vi");
          let secondVietnamese = secondVoice.lang.includes("vi");
          return firstVietnamese && !secondVietnamese ? -1 : !firstVietnamese && secondVietnamese ? 1 : firstVoice.name.localeCompare(secondVoice.name);
        });
        setNativeVoices(voices);
      };
      refreshVoices();
      window.speechSynthesis.addEventListener("voiceschanged", refreshVoices);
      return () => window.speechSynthesis.removeEventListener("voiceschanged", refreshVoices);
    }, []);
    let updateSetting = (field, value) => {
      updateSpeechSettings({
        ...speechSettings,
        [field]: value
      });
    };
    let isNativeProvider = "native" === speechSettings.tts_provider;
    return (0, jsxRuntime.jsxs)("div", {
      className: "space-y-6",
      children: [(0, jsxRuntime.jsx)("h2", {
        className: "sr-only",
        children: "Cài đặt Giọng nói"
      }), (0, jsxRuntime.jsx)(ToggleSwitch, {
        label: "Bật Text-to-Speech (TTS) Toàn Cục",
        checked: speechSettings.tts_enabled ?? false,
        onChange: value => updateSetting("tts_enabled", value)
      }), (0, jsxRuntime.jsxs)("div", {
        className: "space-y-6   " + (speechSettings.tts_enabled ? "" : "opacity-50 pointer-events-none"),
        children: [(0, jsxRuntime.jsx)(ToggleSwitch, {
          label: "Chế độ Đọc Streaming (Real-time)",
          checked: speechSettings.tts_streaming ?? false,
          onChange: value => updateSetting("tts_streaming", value)
        }), (0, jsxRuntime.jsx)(SearchableSelect, {
          label: "Nguồn Giọng Đọc (Provider)",
          value: speechSettings.tts_provider || "gemini",
          onChange: event => updateSetting("tts_provider", event.target.value),
          options: [{
            value: "gemini",
            label: "Gemini AI (Cloud)"
          }, {
            value: "native",
            label: "Trình duyệt (Native)"
          }]
        }), isNativeProvider ? (0, jsxRuntime.jsxs)("div", {
          className: "space-y-4 border-l-2 border-slate-600 pl-4",
          children: [0 === nativeVoices.length ? (0, jsxRuntime.jsx)("p", {
            className: "text-xs text-amber-400",
            children: "Không tìm thấy giọng đọc nào trong trình duyệt. Vui lòng kiểm tra lại thiết bị."
          }) : (0, jsxRuntime.jsx)(SearchableSelect, {
            label: "Giọng Đọc Trình Duyệt",
            value: speechSettings.tts_native_voice || nativeVoices[0]?.voiceURI || "",
            onChange: event => updateSetting("tts_native_voice", event.target.value),
            options: nativeVoices.map(voice => ({
              value: voice.voiceURI,
              label: voice.name
            }))
          }), (0, jsxRuntime.jsx)(NumberInput, {
            label: "Tốc độ (Rate)",
            value: speechSettings.tts_rate ?? 1,
            onChange: value => updateSetting("tts_rate", value),
            min: .1,
            max: 2,
            step: .1
          }), (0, jsxRuntime.jsx)(NumberInput, {
            label: "Cao độ (Pitch)",
            value: speechSettings.tts_pitch ?? 1,
            onChange: value => updateSetting("tts_pitch", value),
            min: 0,
            max: 2,
            step: .1
          })]
        }) : (0, jsxRuntime.jsx)("div", {
          className: "space-y-4 border-l-2 border-slate-600 pl-4",
          children: (0, jsxRuntime.jsx)(SearchableSelect, {
            label: "Giọng đọc Gemini",
            value: speechSettings.tts_voice || "Kore",
            onChange: event => updateSetting("tts_voice", event.target.value),
            options: geminiSpeechVoices.map(voice => ({
              value: voice.id,
              label: voice.name
            }))
          })
        }), (0, jsxRuntime.jsx)("div", {
          className: "flex justify-end pt-2",
          children: (0, jsxRuntime.jsx)("button", {
            onClick: async () => {
              if (!isTestingVoice) {
                setIsTestingVoice(true);
                try {
                  let sampleText = "Xin chào, đây là giọng đọc thử nghiệm. Hệ thống âm thanh đang hoạt động tốt.";
                  if ("gemini" === (speechSettings.tts_provider || "gemini")) await (async (text, voiceName = "Kore", onStart) => {
                    let apiKey = nextGeminiKey();
                    if (!apiKey) throw Error("API Key chưa được cấu hình.");
                    let cleanText = sanitizeSpeechText(text);
                    if (console.log("[TTS] Starting request...", {
                      originalLength: text.length,
                      cleanLength: cleanText.length,
                      voiceName: voiceName
                    }), !cleanText) throw Error("Không có nội dung văn bản hợp lệ để đọc (Văn bản có thể chỉ chứa ký tự đặc biệt).");
                    let client = new GoogleGenAI({
                      apiKey: apiKey
                    });
                    try {
                      let context = await getAudioContext();
                      console.log("[TTS] AudioContext ready/resumed");
                      console.log("[TTS] Sending API request...");
                      let response = await client.models.generateContent({
                        model: "gemini-2.5-flash-preview-tts",
                        contents: {
                          parts: [{
                            text: cleanText
                          }]
                        },
                        config: {
                          responseModalities: [Modality.AUDIO],
                          speechConfig: {
                            voiceConfig: {
                              prebuiltVoiceConfig: {
                                voiceName: voiceName
                              }
                            }
                          },
                          safetySettings: speechSafetySettings
                        }
                      });
                      console.log("[TTS] API Response received");
                      let candidate = response.candidates?.[0];
                      let encodedAudio = candidate?.content?.parts?.[0]?.inlineData?.data;
                      if (!encodedAudio) {
                        let finishReason = candidate?.finishReason;
                        let safetyRatings = candidate?.safetyRatings;
                        throw console.error("[TTS] No audio data.", {
                          finishReason: finishReason,
                          safetyRatings: safetyRatings
                        }), Error("SAFETY" === finishReason || "OTHER" === finishReason ? `AI từ chối đọc do nội dung nhạy cảm. (Reason: ${finishReason})` : `API trả về phản hồi rỗng. (Reason: ${finishReason || "Unknown"})`);
                      }
                      let audioBuffer;
                      let audioBytes = decodeBase64Bytes(encodedAudio);
                      console.log(`[TTS] Decoded ${audioBytes.length} bytes.`);
                      try {
                        let buffer = audioBytes.buffer.slice(0);
                        audioBuffer = await context.decodeAudioData(buffer);
                        console.log("[TTS] Standard decodeAudioData success.");
                      } catch (error) {
                        console.warn("[TTS] Standard decode failed, trying Raw PCM fallback...", error);
                        try {
                          audioBuffer = decodeRawPcmBuffer(audioBytes, context, 24e3);
                          console.log("[TTS] Raw PCM decode success.");
                        } catch (error) {
                          throw console.error("[TTS] All decoding attempts failed.", error), Error("Không thể giải mã dữ liệu âm thanh (Định dạng không hỗ trợ).");
                        }
                      }
                      return new Promise((resolve, reject) => {
                        try {
                          let source = context.createBufferSource();
                          source.buffer = audioBuffer;
                          source.connect(context.destination);
                          source.onended = () => {
                            console.log("[TTS] Playback ended.");
                            resolve();
                          };
                          onStart && onStart();
                          source.start();
                          console.log("[TTS] Playback started.");
                        } catch (error) {
                          reject(error);
                        }
                      });
                    } catch (error) {
                      throw console.error("[TTS] Critical Error:", error), error;
                    }
                  })(sampleText, speechSettings.tts_voice || "Kore");else {
                    let voice = speechSettings.tts_native_voice || "";
                    let rate = speechSettings.tts_rate || 1;
                    let pitch = speechSettings.tts_pitch || 1;
                    await new Promise(resolve => {
                      speakNativeText(sampleText, voice, rate, pitch, undefined, () => resolve());
                    });
                  }
                  showToast("Đã phát âm thanh thử nghiệm thành công.", "success");
                } catch (error) {
                  showToast(`Lỗi thử nghiệm: ${error instanceof Error ? error.message : String(error)}`, "error");
                } finally {
                  setIsTestingVoice(false);
                }
              }
            },
            disabled: isTestingVoice,
            className: "px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-md  flex items-center gap-2 disabled:bg-slate-600 disabled:cursor-not-allowed",
            children: isTestingVoice ? (0, jsxRuntime.jsxs)(jsxRuntime.Fragment, {
              children: [(0, jsxRuntime.jsxs)("svg", {
                "aria-hidden": "true",
                className: " h-4 w-4 text-white",
                xmlns: "http://www.w3.org/2000/svg",
                fill: "none",
                viewBox: "0 0 24 24",
                children: [(0, jsxRuntime.jsx)("circle", {
                  className: "opacity-25",
                  cx: "12",
                  cy: "12",
                  r: "10",
                  stroke: "currentColor",
                  strokeWidth: "4"
                }), (0, jsxRuntime.jsx)("path", {
                  className: "opacity-75",
                  fill: "currentColor",
                  d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                })]
              }), (0, jsxRuntime.jsx)("span", {
                children: "Đang tải..."
              })]
            }) : (0, jsxRuntime.jsxs)(jsxRuntime.Fragment, {
              children: [(0, jsxRuntime.jsx)("svg", {
                "aria-hidden": "true",
                xmlns: "http://www.w3.org/2000/svg",
                className: "h-5 w-5",
                viewBox: "0 0 20 20",
                fill: "currentColor",
                children: (0, jsxRuntime.jsx)("path", {
                  fillRule: "evenodd",
                  d: "M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z",
                  clipRule: "evenodd"
                })
              }), (0, jsxRuntime.jsx)("span", {
                children: "Nghe thử"
              })]
            })
          })
        })]
      })]
    });
  };
}
