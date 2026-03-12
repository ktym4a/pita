/**
 * List Item Handler
 *
 * Converts HTML <li> elements to Slack's list format.
 *
 * Slack List Format:
 * - list attribute ("bullet" or "ordered") goes on the NEWLINE
 * - indent attribute for nested lists (0-based, so level 2 = indent 1)
 * - Example: { insert: "item text" }, { insert: "\n", attributes: { list: "bullet" } }
 *
 * List Level Detection:
 * - Notion: Count parent <ul>/<ol> elements
 * - Google Docs: Read aria-level attribute
 * - This is handled by adapter.getListLevel()
 *
 * Important: This handler does NOT call skipDescendants().
 * Nested lists (<ul>/<ol> inside <li>) need to be processed separately.
 * The list item's direct text content is processed, but nested lists are
 * handled by subsequent walker iterations.
 */

import { isOrderedListItem } from "@/providers/_shared/constants";
import type { SlackTextAttributes, SlackTextOp } from "@/providers/_shared/types";

import type { BlockHandler, HandlerContext } from "../types";

export const listItemHandler: BlockHandler = {
  name: "list-item",

  canHandle(element: Element): boolean {
    return element.tagName.toLowerCase() === "li";
  },

  handle(element: Element, context: HandlerContext): SlackTextOp[] {
    const ops: SlackTextOp[] = [];

    // Get nesting level from adapter (provider-specific logic)
    const level = context.adapter.getListLevel(element);

    // Determine list type: ordered vs bullet
    const isOrdered = isOrderedListItem(element);

    // Get formatted content (skips nested <ul>/<ol> elements)
    const contentOps = context.getFormattedOps(element);
    if (contentOps.length > 0) {
      ops.push(...contentOps);
    }

    // Build list attributes
    const attrs: SlackTextAttributes = {
      list: isOrdered ? "ordered" : "bullet",
    };
    // Add indent for nested lists (level 1 = no indent, level 2+ = indent)
    if (level > 1) {
      attrs.indent = level - 1;
    }

    // Add the list-terminating newline with attributes
    ops.push({ attributes: attrs, insert: "\n" });

    // NOTE: We intentionally do NOT skip descendants here.
    // Notion uses nested <ul>/<ol> elements for sub-lists,
    // which need to be processed by subsequent walker iterations.
    return ops;
  },
};
