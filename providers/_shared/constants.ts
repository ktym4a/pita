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
 * Check if a list item element belongs to an ordered list.
 *
 * Checks both the parent tag (<ol>) and CSS listStyleType for patterns
 * that indicate ordered numbering (decimal, alpha, roman, etc.).
 *
 * @param {Element} element - List item element to check
 * @returns {boolean} True if the element is in an ordered list
 */
export function isOrderedListItem(element: Element): boolean {
  const parentTag = element.parentElement?.tagName?.toLowerCase();
  const listType = (element as HTMLElement).style?.listStyleType ?? "";
  return parentTag === "ol" || ORDERED_LIST_PATTERNS.some((p) => listType.includes(p));
}

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
