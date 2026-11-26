// Provider routing stays compatible with the existing tool settings.
export function createSummaryGeneration(dependencies = {}) {
  async function generateSummary(history, characterName, template, signal) {
    const transcript = history.map(message => `${message.role === 'user' ? 'User' : characterName}: ${dependencies.bd(message.content)}`).join('\n');
    const prompt = template ? template.replace('{{chat_history_slice}}', transcript) : `Tóm tắt ngắn gọn diễn biến chính của đoạn hội thoại sau:\n\n${transcript}`;
    const settings = dependencies.ns();
    let text;
    if (settings.source === 'aistudio') text = await dependencies.__stsAiStudioToolText(prompt, settings.aistudio_tool_model || settings.aistudio_model || 'gemini-2.5-flash', signal);
    else if (dependencies.Cs()) text = await dependencies.Ks(prompt, settings.proxy_tool_model || settings.proxy_model || 'gemini-3-flash-preview', settings.proxy_protocol, undefined, undefined, signal);
    else text = (await dependencies.cl('gemini-3-flash-preview', prompt, {temp:.3}, dependencies._d, signal)).text || '';
    return text.trim();
  }
  return { generateSummary };
}
