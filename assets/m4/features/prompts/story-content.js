const CONTENT_BLOCK_RE = /<content\b[^>]*>([\s\S]*?)<\/content>/gi;
const INTERNAL_REASONING_RE = /<(thinking|thinking_requirements|step_outline|plan|inner_monologue|basic_confirmation|draft|revision_confirmation|draft_unit_plan)\b[^>]*>[\s\S]*?<\/\1>/gi;
const UPDATE_VARIABLE_RE = /<UpdateVariable(?:variable)?>[\s\S]*?<\/UpdateVariable(?:variable)?>/gi;
const LOGIC_STORE_RE = /<LogicStore>[\s\S]*?<\/LogicStore>/gi;
const VISUAL_INTERFACE_RE = /<VisualInterface>[\s\S]*?<\/VisualInterface>/gi;
const STATUS_PLACEHOLDER_RE = /<StatusPlaceHolderImpl\s*\/?>/gi;
const CHOICE_MARKER_RE = /\[CHOICE:[\s\S]*?\]/gi;
const FENCED_CODE_BLOCK_RE = /```[\s\S]*?```/g;
const TABLE_EDIT_BLOCK_RE = /<tableThink>[\s\S]*?<\/tableEdit>/gi;
const STRAY_CONTENT_TAG_RE = /<\/?content\b[^>]*>/gi;
const MULTI_NEWLINE_RE = /\n\s*\n/g;

export function extractStoryContent(rawContent) {
  if (!rawContent) {
    return '';
  }

  const sourceText = String(rawContent);
  const contentMatches = [...sourceText.matchAll(CONTENT_BLOCK_RE)];
  const baseText = contentMatches.length > 0
    ? contentMatches.map(match => match[1]).join('\n\n')
    : sourceText;

  return baseText
    .replace(INTERNAL_REASONING_RE, '')
    .replace(UPDATE_VARIABLE_RE, '')
    .replace(LOGIC_STORE_RE, '')
    .replace(VISUAL_INTERFACE_RE, '')
    .replace(STATUS_PLACEHOLDER_RE, '')
    .replace(CHOICE_MARKER_RE, '')
    .replace(FENCED_CODE_BLOCK_RE, '')
    .replace(TABLE_EDIT_BLOCK_RE, '')
    .replace(STRAY_CONTENT_TAG_RE, '')
    .replace(MULTI_NEWLINE_RE, '\n')
    .trim();
}
