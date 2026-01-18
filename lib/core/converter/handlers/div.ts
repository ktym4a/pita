/**
 * Div Handler
 *
 * Fallback handler for <div> elements that contain text content.
 *
 * Many web apps use <div> elements for text blocks instead of semantic
 * elements like <p>. This handler catches those cases.
 *
 * Matching criteria:
 * - Element is a <div>
 * - Not inside a list item (<li>)
 * - Not inside a paragraph (<p>)
 * - Contains either:
 *   - Direct text content (text nodes)
 *   - Inline elements (span, a, b, i, etc.)
 *
 * This prevents empty divs (used for layout) from creating blank lines.
 */

import type { SlackTextOp } from "@/providers/_shared/types";

import { INLINE_TAGS } from "@/providers/_shared/constants";

import type { BlockHandler, HandlerContext } from "../types";

export const divHandler: BlockHandler = {
  name: "div",

  /**
   * Handle <div> elements that:
   * 1. Are not inside list items or paragraphs
   * 2. Contain actual text content (not just layout divs)
   *
   * @param {Element} element - Element to check
   * @returns {boolean} True if element is a content div
   */
  canHandle(element: Element): boolean {
    const tagName = element.tagName.toLowerCase();
    return tagName === "div" && !element.closest("li") && !element.closest("p");
  },

  handle(element: Element, context: HandlerContext): SlackTextOp[] {
    const ops: SlackTextOp[] = [];

    // Check if div has meaningful content (not just a layout container)
    // Look for direct text nodes with non-whitespace content
    const hasTextContent = Array.from(element.childNodes).some(
      (child) => child.nodeType === Node.TEXT_NODE && (child.textContent?.trim() ?? ""),
    );

    // Also check for inline elements that might contain text
    const inlineSelector = INLINE_TAGS.join(", ");
    const hasInlineElements = element.querySelector(inlineSelector);

    // Only process if there's actual content
    if (hasTextContent || hasInlineElements) {
      const contentOps = context.getFormattedOps(element);
      if (contentOps.length > 0) {
        ops.push(...contentOps);
        ops.push({ insert: "\n" });
      }
    }

    // Skip descendants - we've processed this div's content
    context.skipDescendants(element);
    return ops;
  },
};
