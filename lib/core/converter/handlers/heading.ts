/**
 * Heading Handler
 *
 * Converts HTML heading elements (<h1> through <h6>) to text with newline.
 *
 * Note: Slack's texty format doesn't have special heading formatting.
 * Headings are converted to plain text (with inline formatting preserved).
 * The heading level is not preserved in the output.
 *
 * Important: Only handles headings NOT inside list items.
 */

import type { SlackTextOp } from "@/providers/_shared/types";

import type { BlockHandler, HandlerContext } from "../types";

export const headingHandler: BlockHandler = {
  name: "heading",

  /**
   * Handle <h1>-<h6> elements that are NOT inside list items.
   *
   * @param {Element} element - Element to check
   * @returns {boolean} True if element is a heading not in a list
   */
  canHandle(element: Element): boolean {
    const tagName = element.tagName.toLowerCase();
    return /^h[1-6]$/.test(tagName) && !element.closest("li");
  },

  handle(element: Element, context: HandlerContext): SlackTextOp[] {
    const ops: SlackTextOp[] = [];

    const contentOps = context.getFormattedOps(element);
    if (contentOps.length > 0) {
      ops.push(...contentOps);
      // Simple newline - Slack doesn't support heading levels
      ops.push({ insert: "\n" });
    }

    // Skip descendants - we've processed the entire heading
    context.skipDescendants(element);
    return ops;
  },
};
