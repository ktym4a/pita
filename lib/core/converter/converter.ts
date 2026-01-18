/**
 * HTML to Slack Texty Converter
 *
 * Converts HTML copied from Notion/Google Docs to Slack's texty format.
 * Slack texty is a Delta-like format used internally by Slack for rich text.
 *
 * Architecture:
 * - Uses TreeWalker for efficient DOM traversal
 * - Delegates element processing to specialized handlers (Handler pattern)
 * - Handlers are tried in order; first matching handler processes the element
 *
 * Slack Texty Format:
 * - Array of operations (ops)
 * - Each op has `insert` (text) and optional `attributes`
 * - Block-level formatting (list, blockquote) is on the newline character
 * - Inline formatting (bold, italic) is on the text itself
 */

import type { ServiceAdapter, SlackTextOp, SlackTexty } from "@/providers/_shared/types";

import type { HandlerContext } from "./types";

import { getFormattedOps } from "./formatters";
import { BLOCK_HANDLERS } from "./handlers";
import { skipDescendants } from "./utils";

/**
 * Convert HTML to Slack texty format.
 *
 * Process:
 * 1. Parse HTML string into DOM
 * 2. Create TreeWalker to traverse all elements
 * 3. For each element, find a handler that can process it
 * 4. Handler returns SlackTextOps which are accumulated
 *
 * @param {string} html - HTML string from clipboard
 * @param {ServiceAdapter} adapter - Provider-specific adapter for list levels, URL extraction, etc.
 * @returns {SlackTexty} SlackTexty object with ops array
 */
export function convertToSlackTexty(html: string, adapter: ServiceAdapter): SlackTexty {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const ops: SlackTextOp[] = [];

  // TreeWalker is more efficient than querySelectorAll for processing
  // all elements in document order with the ability to skip subtrees
  const walker = document.createTreeWalker(doc.body, NodeFilter.SHOW_ELEMENT, null);

  // Create handler context - shared state and utilities for all handlers
  const context: HandlerContext = {
    adapter,
    walker,
    getFormattedOps: (element, options) => getFormattedOps(element, adapter, {}, options),
    skipDescendants: (node) => skipDescendants(walker, node),
  };

  let node: Node | null;
  while ((node = walker.nextNode())) {
    const element = node as Element;

    // Find first handler that can process this element
    // Handler order matters: more specific handlers should come first
    for (const handler of BLOCK_HANDLERS) {
      if (handler.canHandle(element)) {
        ops.push(...handler.handle(element, context));
        // Only one handler processes each element
        break;
      }
    }
    // If no handler matches, element is skipped (inline elements are
    // processed by their parent's getFormattedOps call)
  }

  return { ops };
}

/**
 * Convert HTML to plain text with formatting (fallback).
 *
 * Used as the text/plain clipboard data for apps that don't support slack/texty.
 * Provides basic list formatting with bullet points and indentation.
 *
 * @param {string} html - HTML string to convert
 * @returns {string} Plain text with basic formatting
 */
export function convertToPlainText(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  let result = "";

  const processNode = (node: Node, level = 0): void => {
    for (const child of node.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent?.trim();
        if (text) result += text;
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const element = child as Element;
        const tagName = element.tagName.toLowerCase();

        if (tagName === "li") {
          // Format list items with indentation and bullet
          const indent = "    ".repeat(level);
          result += `${indent}• ${element.textContent?.trim() ?? ""}\n`;
        } else if (tagName === "ul" || tagName === "ol") {
          // Recurse into lists with increased level for indentation
          processNode(child, level + 1);
        } else if (tagName === "p") {
          result += `${element.textContent?.trim() ?? ""}\n`;
        } else if (tagName === "br") {
          result += "\n";
        } else {
          processNode(child, level);
        }
      }
    }
  };

  processNode(doc.body);
  return result;
}

/**
 * Check if HTML contains list elements.
 *
 * Used by Google Docs content script to filter non-list content.
 * Google Docs copies include list formatting that Slack can't handle natively,
 * but regular text formatting works fine without conversion.
 *
 * @param {string} html - HTML string to check
 * @returns {boolean} True if HTML contains list elements
 */
export function containsLists(html: string): boolean {
  // Simple regex check is faster than parsing DOM
  return /<li[\s>]/i.test(html);
}
