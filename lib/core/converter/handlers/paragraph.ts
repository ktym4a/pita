/**
 * Paragraph Handler
 *
 * Converts HTML <p> elements to plain text with newline.
 *
 * Slack doesn't have a special paragraph format - paragraphs are just
 * text followed by a newline.
 *
 * Important: Only handles paragraphs NOT inside list items.
 * Paragraphs inside <li> elements are processed as part of the list item content.
 */

import type { SlackTextOp } from "@/providers/_shared/types";

import type { BlockHandler, HandlerContext } from "../types";

export const paragraphHandler: BlockHandler = {
  name: "paragraph",

  /**
   * Handle <p> elements that are NOT inside list items.
   * <p> inside <li> is processed by list-item handler's getFormattedOps.
   *
   * @param {Element} element - Element to check
   * @returns {boolean} True if element is a paragraph not in a list
   */
  canHandle(element: Element): boolean {
    const tagName = element.tagName.toLowerCase();
    return tagName === "p" && !element.closest("li");
  },

  handle(element: Element, context: HandlerContext): SlackTextOp[] {
    const ops: SlackTextOp[] = [];

    const contentOps = context.getFormattedOps(element);
    if (contentOps.length > 0) {
      ops.push(...contentOps);
      // Simple newline - no special block attributes for paragraphs
      ops.push({ insert: "\n" });
    }

    // Skip descendants - we've processed the entire paragraph
    context.skipDescendants(element);
    return ops;
  },
};
