/**
 * Blockquote Handler
 *
 * Converts HTML <blockquote> elements to Slack's blockquote format.
 *
 * Slack Blockquote Format:
 * - Blockquote attribute goes on the NEWLINE character, not the text
 * - Each line in a blockquote needs its own newline with blockquote: true
 * - Example: { insert: "quoted text" }, { insert: "\n", attributes: { blockquote: true } }
 *
 * Complexity:
 * This handler is complex because blockquotes need character-level processing:
 * 1. Preserve inline formatting (bold, italic, etc.) within the blockquote
 * 2. Split content into lines at newline characters
 * 3. Add blockquote attribute to each line's terminating newline
 */

import type { SlackTextOp } from "@/providers/_shared/types";

import type { BlockHandler, HandlerContext, CharInfo } from "../types";

/**
 * Build character-level representation from SlackTextOps.
 * Each character tracks its formatting attributes.
 *
 * @param {SlackTextOp[]} contentOps - Operations to convert
 * @returns {CharInfo[]} Character array with attributes
 */
function buildCharInfoArray(contentOps: SlackTextOp[]): CharInfo[] {
  const chars: CharInfo[] = [];
  for (const op of contentOps) {
    for (const char of op.insert) {
      chars.push({ char, attrs: op.attributes });
    }
  }
  return chars;
}

/**
 * Trim leading and trailing whitespace from a line.
 *
 * @param {CharInfo[]} line - Line to trim
 * @returns {CharInfo[]} Trimmed line
 */
function trimLine(line: CharInfo[]): CharInfo[] {
  const result = [...line];
  while (result.length > 0 && result[0]?.char.trim() === "") {
    result.shift();
  }
  while (result.length > 0 && result[result.length - 1]?.char.trim() === "") {
    result.pop();
  }
  return result;
}

/**
 * Convert a line of characters to SlackTextOps.
 * Groups consecutive characters with same attributes.
 *
 * @param {CharInfo[]} line - Line to convert
 * @returns {SlackTextOp[]} Text operations for the line
 */
function convertLineToOps(line: CharInfo[]): SlackTextOp[] {
  const ops: SlackTextOp[] = [];
  let i = 0;

  while (i < line.length) {
    const startAttrs = line[i]?.attrs;
    const attrsKey = JSON.stringify(startAttrs ?? {});
    let text = "";

    while (i < line.length && JSON.stringify(line[i]?.attrs ?? {}) === attrsKey) {
      text += line[i]?.char ?? "";
      i++;
    }

    if (text) {
      if (startAttrs && Object.keys(startAttrs).length > 0) {
        ops.push({ insert: text, attributes: startAttrs });
      } else {
        ops.push({ insert: text });
      }
    }
  }

  return ops;
}

export const blockquoteHandler: BlockHandler = {
  name: "blockquote",

  /**
   * Handle blockquotes that are NOT inside list items.
   * Blockquotes inside lists are processed as part of the list item content.
   *
   * @param {Element} element - Element to check
   * @returns {boolean} True if element is a standalone blockquote
   */
  canHandle(element: Element): boolean {
    const tagName = element.tagName.toLowerCase();
    return tagName === "blockquote" && !element.closest("li");
  },

  handle(element: Element, context: HandlerContext): SlackTextOp[] {
    const ops: SlackTextOp[] = [];
    const contentOps = context.getFormattedOps(element, { preserveNewlines: true });
    const chars = buildCharInfoArray(contentOps);

    let currentLine: CharInfo[] = [];

    const flushLine = (): void => {
      const trimmed = trimLine(currentLine);
      if (trimmed.length === 0) {
        currentLine = [];
        return;
      }

      ops.push(...convertLineToOps(trimmed));
      ops.push({ attributes: { blockquote: true }, insert: "\n" });
      currentLine = [];
    };

    for (const charInfo of chars) {
      if (charInfo.char === "\n") {
        flushLine();
      } else {
        currentLine.push(charInfo);
      }
    }
    flushLine();

    context.skipDescendants(element);
    return ops;
  },
};
