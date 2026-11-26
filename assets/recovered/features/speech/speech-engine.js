// Recovered from the application host. One owner; dependency getters preserve late binding.
export function createSpeechEngine(dependencies = {}) {
var speechSafetySettings=[{category:dependencies.HarmCategory.HARM_CATEGORY_HARASSMENT,threshold:dependencies.HarmBlockThreshold.BLOCK_NONE},{category:dependencies.HarmCategory.HARM_CATEGORY_HATE_SPEECH,threshold:dependencies.HarmBlockThreshold.BLOCK_NONE},{category:dependencies.HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,threshold:dependencies.HarmBlockThreshold.BLOCK_NONE},{category:dependencies.HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,threshold:dependencies.HarmBlockThreshold.BLOCK_NONE},{category:dependencies.HarmCategory.HARM_CATEGORY_CIVIC_INTEGRITY,threshold:dependencies.HarmBlockThreshold.BLOCK_NONE}];
var generateGeminiSpeech = async (text, voiceName = "Kore") => {
  let apiKey = (0, dependencies.nextGeminiKey)();
  if (!apiKey) throw Error("API Key chưa được cấu hình.");
  let speechText = sanitizeSpeechText(text);
  if (!speechText) throw Error("Không có nội dung văn bản hợp lệ.");
  let client = new dependencies.GoogleGenAI({apiKey: apiKey});
  let context = await (0, dependencies.getAudioContext)();
  let encodedAudio = (await client.models.generateContent({
    model: "gemini-2.5-flash-preview-tts", contents: {parts: [{text: speechText}]},
    config: {responseModalities: [dependencies.Modality.AUDIO], speechConfig: {voiceConfig: {prebuiltVoiceConfig: {voiceName: voiceName}}}, safetySettings: speechSafetySettings}
  })).candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!encodedAudio) throw Error("API không trả về dữ liệu âm thanh.");
  let bytes = (0, dependencies.decodeBase64Bytes)(encodedAudio);
  try {
    let buffer = bytes.buffer.slice(0);
    return await context.decodeAudioData(buffer);
  } catch {
    try {
      return (0, dependencies.decodeRawPcmBuffer)(bytes, context, 24e3);
    } catch {
      throw Error("Không thể giải mã dữ liệu âm thanh.");
    }
  }
};
var nativeSpeechGeneration=0;
var stopNativeSpeech=()=>{nativeSpeechGeneration++,typeof window<"u"&&window.speechSynthesis&&(window.speechSynthesis.speaking||window.speechSynthesis.pending)&&window.speechSynthesis.cancel()};
var speakNativeText = (text, voiceUri, rate = 1, pitch = 1, onStart, onEnd) => {
  if (typeof window.SpeechSynthesisUtterance !== "function" || !window.speechSynthesis) {
    console.warn("[TTS] Browser voice unavailable");
    if (onEnd) onEnd();
    return;
  }
  stopNativeSpeech();
  let generation = ++nativeSpeechGeneration;
  let speechText = sanitizeSpeechText(text);
  if (!speechText) return void (onEnd && onEnd());
  let utterance = new SpeechSynthesisUtterance(speechText);
  let voices = window.speechSynthesis.getVoices();
  let selectedVoice = voices.find(voice => voice.voiceURI === voiceUri);
  if (selectedVoice) utterance.voice = selectedVoice;
  else {
    let vietnameseVoice = voices.find(voice => voice.lang.includes("vi"));
    if (vietnameseVoice) utterance.voice = vietnameseVoice;
  }
  utterance.rate = rate;
  utterance.pitch = pitch;
  if (onStart) utterance.onstart = onStart;
  utterance.onend = () => { generation === nativeSpeechGeneration && onEnd && onEnd(); };
  utterance.onerror = event => { generation === nativeSpeechGeneration && (console.error("Native TTS Error:", event.error || event), onEnd && onEnd()); };
  setTimeout(() => { generation === nativeSpeechGeneration && window.speechSynthesis.speak(utterance); }, 50);
};
var geminiSpeechVoices=[{id:"Puck",name:"Puck (Nam, Trầm, Kể chuyện)"},{id:"Charon",name:"Charon (Nam, Sâu, Uy quyền)"},{id:"Kore",name:"Kore (Nữ, Dịu, Thư giãn)"},{id:"Fenrir",name:"Fenrir (Nam, Mạnh, Sôi nổi)"},{id:"Zephyr",name:"Zephyr (Nữ, Cao, Tự tin)"}];
var sanitizeSpeechText=text=>{if(!text)return"";let sanitized=String(text).slice(0,5e5).replace(/<(thinking|thinking_requirements|step_outline|plan|inner_monologue|basic_confirmation|draft|revision_confirmation|draft_unit_plan|UpdateVariable(?:variable)?|LogicStore|VisualInterface)[^>]*>[\s\S]*?<\/\1>/gi," ").replace(/<tableThink[^>]*>[\s\S]*?<\/tableEdit>/gi," ").replace(/<(script|style|template|svg|canvas)[^>]*>[\s\S]*?<\/\1>/gi," ").replace(/```[\s\S]*?```/g," ").replace(/!\[([^\]]*)\]\([^)]*\)/g,"$1").replace(/\[([^\]]+)\]\([^)]*\)/g,"$1").replace(/`([^`]+)`/g,"$1").replace(/<[^>]+>/g," ").replace(/\[CHOICE:\s*["']?([\s\S]*?)["']?\]/gi,"$1").replace(/[*_~#>|]/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&quot;/gi,'"').replace(/&#(?:39|x27);/gi,"'").replace(/\s+/g," ").trim();return sanitized.length>5e4&&(sanitized=sanitized.slice(0,5e4).trim()),sanitized};
return { speechSafetySettings, generateGeminiSpeech, stopNativeSpeech, speakNativeText, geminiSpeechVoices, sanitizeSpeechText };
}
