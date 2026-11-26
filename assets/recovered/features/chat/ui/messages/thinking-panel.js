const THINKING_TAG_LABELS = {
  thinking_requirements: 'Yêu cầu Suy nghĩ',
  step_outline: 'Dàn ý Bước đi',
  plan: 'Kế hoạch',
  inner_monologue: 'Suy nghĩ nội tâm',
  basic_confirmation: 'Xác nhận cơ bản',
  draft: 'Bản nháp',
  revision_confirmation: 'Xác nhận chỉnh sửa',
  draft_unit_plan: 'Kế hoạch đơn vị',
};

const THINKING_BLOCK_RE = /<(thinking|thinking_requirements|step_outline|plan|inner_monologue|basic_confirmation|draft|revision_confirmation|draft_unit_plan)>([\s\S]*?)<\/\1>/gi;

export const MARKDOWN_SANITIZE_OPTIONS = {
  ADD_TAGS: ['details', 'summary'],
  ADD_ATTR: ['class', 'open'],
  FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed'],
  FORBID_ATTR: ['style', 'srcdoc'],
};

export function extractThinkingBlocksAndCleanText(rawContent, includePipelineBlocks) {
  const thinkingBlocks = [];
  const matcher = new RegExp(THINKING_BLOCK_RE.source, THINKING_BLOCK_RE.flags);
  let remainingText = rawContent;
  let match;

  while ((match = matcher.exec(rawContent)) !== null) {
    const tagName = match[1].toLowerCase();
    const blockBody = match[2].trim();
    const label = THINKING_TAG_LABELS[tagName] || 'Suy nghĩ';
    if (includePipelineBlocks) {
      thinkingBlocks.push({ label, content: blockBody });
    }
    remainingText = remainingText.replace(match[0], '');
  }

  return { thinkingBlocks, remainingText };
}

export function createStreamingThinkingPanel(getDependencies) {
  return function StreamingThinkingPanel({
    content,
    isStreaming,
    messageId,
    slot = 'main',
  }) {
    const {
      markdownParser,
      ThinkingBlock,
      htmlSanitizer,
      LiveStreamText,
      react,
      jsxRuntime,
    } = getDependencies();

    if (isStreaming) {
      return jsxRuntime.jsx(LiveStreamText, {
        messageId,
        slot,
        fallback: content,
      });
    }

    const { mainHtml, thinkingBlocks } = react.useMemo(() => {
      if (!content) {
        return { mainHtml: '', thinkingBlocks: [] };
      }
      const { thinkingBlocks: blocks, remainingText } = extractThinkingBlocksAndCleanText(content, true);
      const parsedHtml = markdownParser.parse(remainingText.trim());
      return {
        mainHtml: htmlSanitizer.sanitize(parsedHtml, MARKDOWN_SANITIZE_OPTIONS),
        thinkingBlocks: blocks,
      };
    }, [content]);

    if (!content) {
      return jsxRuntime.jsx('span', {
        className: ' opacity-50',
        children: 'Đang khởi tạo...',
      });
    }

    return jsxRuntime.jsxs(jsxRuntime.Fragment, {
      children: [
        thinkingBlocks.map((block, index) => jsxRuntime.jsx(ThinkingBlock, {
          content: block.content,
          label: block.label,
        }, index)),
        jsxRuntime.jsx('div', {
          className: 'markdown-content',
          dangerouslySetInnerHTML: { __html: mainHtml },
        }),
      ],
    });
  };
}
