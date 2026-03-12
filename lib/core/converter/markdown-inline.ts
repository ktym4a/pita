/**
 * Markdown Inline Processing
 *
 * Handles inline formatting detection, text wrapping, and inline content
 * extraction for the Slack markdown converter.
 *
 * Separated from markdown-converter.ts to keep module sizes manageable.
 */

import type { ServiceAdapter } from "@/providers/_shared/types";

import { STYLE_PATTERNS } from "@/providers/_shared/constants";

/**
 * Inline formatting state tracked during recursion.
 */
export interface InlineFormatting {
  bold: boolean;
  italic: boolean;
  strike: boolean;
  code: boolean;
  link: string | null;
}

export const EMPTY_FORMATTING: InlineFormatting = {
  bold: false,
  italic: false,
  strike: false,
  code: false,
  link: null,
};

/**
 * Wrap text with Slack markdown formatting characters.
 *
 * Order matters: code is applied first (innermost), then strike, italic, bold.
 * Code formatting suppresses all other formatting since Slack renders
 * inline code as monospace without further formatting.
 *
 * @param {string} text - Raw text content
 * @param {InlineFormatting} formatting - Active formatting state
 * @returns {string} Text wrapped with markdown syntax
 */
export function wrapWithFormatting(text: string, formatting: InlineFormatting): string {
  if (!text) return "";

  let result = text;

  // Code suppresses all other inline formatting in Slack
  if (formatting.code) return `\`${result}\``;

  if (formatting.strike) result = `~${result}~`;
  if (formatting.italic) result = `_${result}_`;
  if (formatting.bold) result = `*${result}*`;

  if (formatting.link) result = `[${result}](${formatting.link})`;

  return result;
}

/**
 * Derive inline formatting from an HTML element.
 *
 * @param {Element} element - HTML element to extract formatting from
 * @param {InlineFormatting} parent - Inherited formatting from parent elements
 * @param {ServiceAdapter} adapter - Provider adapter for wrapper detection and URL extraction
 * @returns {InlineFormatting} Merged formatting state
 */
function getInlineFormatting(
  element: Element,
  parent: InlineFormatting,
  adapter: ServiceAdapter,
): InlineFormatting {
  const tagName = element.tagName.toLowerCase();
  const style = element.getAttribute("style") ?? "";
  const f = { ...parent };

  // Tag-based formatting
  if (
    (tagName === "b" || tagName === "strong") &&
    !adapter.isWrapperElement(element, style) &&
    !STYLE_PATTERNS.boldNormal.test(style)
  ) {
    f.bold = true;
  }
  if (tagName === "i" || tagName === "em") f.italic = true;
  if (tagName === "s" || tagName === "strike" || tagName === "del") f.strike = true;
  if (tagName === "code") f.code = true;
  if (tagName === "a") {
    const href = element.getAttribute("href");
    if (href) f.link = adapter.extractUrl(href);
  }

  // Style-based formatting
  if (STYLE_PATTERNS.bold.test(style)) f.bold = true;
  if (STYLE_PATTERNS.italic.test(style)) f.italic = true;
  if (STYLE_PATTERNS.strikethrough.test(style)) f.strike = true;

  return f;
}

/**
 * Check if child formatting introduces new markers compared to parent.
 *
 * @param {InlineFormatting} child - Child formatting state
 * @param {InlineFormatting} parent - Parent formatting state
 * @returns {boolean} True if child has formatting not in parent
 */
function hasNewFormatting(child: InlineFormatting, parent: InlineFormatting): boolean {
  return (
    (child.bold && !parent.bold) ||
    (child.italic && !parent.italic) ||
    (child.strike && !parent.strike) ||
    (child.code && !parent.code) ||
    (child.link !== null && parent.link === null)
  );
}

/**
 * Append a text segment to the result, handling formatting boundary spacing.
 *
 * @param {string} result - Current result string
 * @param {string} text - Text segment to append
 * @param {InlineFormatting} formatting - Active formatting state
 * @param {boolean} prevHadNewFormatting - Whether the previous segment had new formatting
 * @returns {{ result: string; prevHadNewFormatting: boolean }} Updated state
 */
function appendTextSegment(
  result: string,
  text: string,
  formatting: InlineFormatting,
  prevHadNewFormatting: boolean,
): { result: string; prevHadNewFormatting: boolean } {
  const leading = text.startsWith(" ") ? " " : "";
  const trailing = text.endsWith(" ") ? " " : "";
  const trimmed = text.trim();
  if (!trimmed) return { result, prevHadNewFormatting };

  let out = result;

  // Ensure space after previously formatted segment
  if (prevHadNewFormatting && !leading && out && !out.endsWith(" ") && !out.endsWith("\n")) {
    out += " ";
  }

  // Avoid double spaces (e.g., when an empty element like <img> is skipped)
  const effectiveLeading = leading && (out.endsWith(" ") || out.endsWith("\n")) ? "" : leading;
  out += effectiveLeading + wrapWithFormatting(trimmed, formatting) + trailing;
  return { result: out, prevHadNewFormatting: false };
}

/**
 * Process a text node, optionally preserving literal newlines.
 *
 * @param {string} raw - Raw text content from the text node
 * @param {InlineFormatting} formatting - Active formatting state
 * @param {{ result: string; prevHadNewFormatting: boolean }} state - Current processing state
 * @param {boolean} preserveNewlines - Whether to preserve literal newlines
 * @returns {{ result: string; prevHadNewFormatting: boolean }} Updated state
 */
function processTextNode(
  raw: string,
  formatting: InlineFormatting,
  state: { result: string; prevHadNewFormatting: boolean },
  preserveNewlines: boolean,
): { result: string; prevHadNewFormatting: boolean } {
  if (preserveNewlines && raw.includes("\n")) {
    const lines = raw.split("\n");
    let { result, prevHadNewFormatting } = state;
    for (let i = 0; i < lines.length; i++) {
      if (i > 0) {
        result += "\n";
        prevHadNewFormatting = false;
      }
      const collapsed = lines[i].replace(/\s+/g, " ");
      ({ result, prevHadNewFormatting } = appendTextSegment(
        result,
        collapsed,
        formatting,
        prevHadNewFormatting,
      ));
    }
    return { result, prevHadNewFormatting };
  }

  const collapsed = raw.replace(/\s+/g, " ");
  return appendTextSegment(state.result, collapsed, formatting, state.prevHadNewFormatting);
}

/**
 * Process inline content of a block element, skipping nested lists.
 *
 * Ensures spaces around Slack formatting markers at formatting boundaries.
 * Slack requires whitespace around markers like *bold* and _italic_ for
 * them to be recognized as formatting.
 *
 * @param {Element} element - Block element to extract inline content from
 * @param {ServiceAdapter} adapter - Provider adapter
 * @param {InlineFormatting} formatting - Current formatting state
 * @param {boolean} preserveNewlines - Whether to preserve literal newlines in text nodes
 * @returns {string} Formatted markdown string
 */
export function processInlineContent(
  element: Element,
  adapter: ServiceAdapter,
  formatting: InlineFormatting,
  preserveNewlines = false,
): string {
  let result = "";
  let prevHadNewFormatting = false;

  for (const child of element.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      ({ result, prevHadNewFormatting } = processTextNode(
        child.textContent ?? "",
        formatting,
        { result, prevHadNewFormatting },
        preserveNewlines,
      ));
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as Element;
      const tag = el.tagName.toLowerCase();

      // Skip nested lists — processed separately
      if (tag === "ul" || tag === "ol") continue;

      const childFormatting = getInlineFormatting(el, formatting, adapter);
      const isNewlyFormatted = hasNewFormatting(childFormatting, formatting);
      const segment = processInlineContent(el, adapter, childFormatting, preserveNewlines);

      if (!segment) continue;

      // Add space at formatting boundary (formatted↔unformatted or different formatting)
      if (
        (isNewlyFormatted || prevHadNewFormatting) &&
        result &&
        !result.endsWith(" ") &&
        !result.endsWith("\n") &&
        !segment.startsWith(" ")
      ) {
        result += " ";
      }

      result += segment;
      prevHadNewFormatting = isNewlyFormatted;
    }
  }

  return result;
}
