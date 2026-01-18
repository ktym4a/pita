/**
 * Inline HTML tags that contain formatted text
 */
export const INLINE_TAGS = [
  "span",
  "a",
  "b",
  "i",
  "u",
  "s",
  "em",
  "strong",
  "code",
  "del",
  "strike",
] as const;

/**
 * List style patterns that indicate ordered lists
 */
export const ORDERED_LIST_PATTERNS = ["decimal", "number", "alpha", "roman"] as const;

/**
 * CSS style detection patterns for text formatting
 */
export const STYLE_PATTERNS = {
  bold: /font-weight\s*:\s*(bold|700|800|900)/i,
  boldNormal: /font-weight\s*:\s*(normal|400)\s*(;|$)/i,
  italic: /font-style\s*:\s*italic/i,
  // Notion may use border-bottom for underline
  underline: /(text-decoration[^:]*:\s*[^;]*underline|border-bottom\s*:)/i,
  strikethrough: /text-decoration[^:]*:\s*[^;]*line-through/i,
} as const;
