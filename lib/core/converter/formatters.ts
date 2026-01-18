/**
 * Text Formatters
 *
 * Functions for extracting and processing inline text formatting.
 * These handle bold, italic, underline, strikethrough, code, and links.
 *
 * Design Decision:
 * Originally there were two nearly identical functions:
 * - getFormattedOps (trimmed whitespace)
 * - getFormattedOpsWithNewlines (preserved newlines)
 *
 * These were unified into a single function with a `preserveNewlines` option
 * to eliminate DRY violation while maintaining both behaviors.
 */

import type { ServiceAdapter, SlackTextAttributes, SlackTextOp } from "@/providers/_shared/types";

import { STYLE_PATTERNS } from "@/providers/_shared/constants";

import { createTextOp } from "./utils";

/**
 * Extract style attributes from inline style string.
 *
 * Parses CSS style attribute to detect text formatting.
 * Uses regex patterns defined in constants.ts.
 *
 * @example
 * extractStyleAttributes('font-weight: bold; font-style: italic;')
 * // Returns: { bold: true, italic: true }
 *
 * @param {string} style - CSS style string to parse
 * @returns {SlackTextAttributes} Detected formatting attributes
 */
export function extractStyleAttributes(style: string): SlackTextAttributes {
  const attrs: SlackTextAttributes = {};
  if (STYLE_PATTERNS.bold.test(style)) attrs.bold = true;
  if (STYLE_PATTERNS.italic.test(style)) attrs.italic = true;
  if (STYLE_PATTERNS.underline.test(style)) attrs.underline = true;
  if (STYLE_PATTERNS.strikethrough.test(style)) attrs.strike = true;
  return attrs;
}

/**
 * Get attributes from HTML tag.
 *
 * Maps semantic HTML tags to Slack text attributes.
 * Also handles provider-specific wrapper detection via adapter.isWrapperElement().
 *
 * Special handling:
 * - Bold tags (<b>, <strong>): Skip if it's a wrapper element (e.g., Google Docs wrapper)
 * - Link tags (<a>): Extract URL via adapter.extractUrl() to handle redirects
 *
 * @param {string} tagName - Lowercase tag name
 * @param {Element} element - DOM element
 * @param {string} style - Inline style string
 * @param {ServiceAdapter} adapter - Provider-specific adapter
 * @returns {SlackTextAttributes} Attributes derived from tag
 */
export function getTagAttributes(
  tagName: string,
  element: Element,
  style: string,
  adapter: ServiceAdapter,
): SlackTextAttributes {
  const attrs: SlackTextAttributes = {};

  // Bold tags - but exclude wrapper elements that aren't actually bold
  // Google Docs uses <b> tags with docs-internal-guid as container wrappers
  if (
    (tagName === "b" || tagName === "strong") &&
    !adapter.isWrapperElement(element, style) &&
    !STYLE_PATTERNS.boldNormal.test(style)
  ) {
    attrs.bold = true;
  }

  if (tagName === "i" || tagName === "em") attrs.italic = true;
  if (tagName === "u") attrs.underline = true;
  if (tagName === "s" || tagName === "strike" || tagName === "del") {
    attrs.strike = true;
  }
  if (tagName === "code") attrs.code = true;

  // Links - use adapter to extract actual URL from potential redirects
  // Google Docs wraps external links: https://www.google.com/url?q=ACTUAL_URL
  if (tagName === "a") {
    const href = element.getAttribute("href");
    if (href) attrs.link = adapter.extractUrl(href);
  }

  return attrs;
}

/**
 * Options for getFormattedOps
 */
export interface FormattedOpsOptions {
  /**
   * If true, preserve newlines in text content.
   * Used by blockquote handler to split content into lines.
   * Default: false (trim whitespace for clean output)
   */
  preserveNewlines?: boolean;
}

/**
 * Get formatted ops from an element.
 *
 * Recursively processes an element's children to extract text with formatting.
 * Handles both text nodes and nested elements.
 *
 * Attribute inheritance:
 * - Parent attributes are passed down to children
 * - Child elements can add additional attributes
 * - Attributes are merged (child overrides parent for same property)
 *
 * @param {Element} element - The element to process
 * @param {ServiceAdapter} adapter - Service adapter for provider-specific behavior
 * @param {SlackTextAttributes} inheritedAttrs - Attributes inherited from parent elements
 * @param {FormattedOpsOptions} options - Processing options
 * @returns {SlackTextOp[]} Array of text operations with formatting
 */
export function getFormattedOps(
  element: Element,
  adapter: ServiceAdapter,
  inheritedAttrs: SlackTextAttributes = {},
  options: FormattedOpsOptions = {},
): SlackTextOp[] {
  const ops: SlackTextOp[] = [];
  const { preserveNewlines = false } = options;

  for (const child of element.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent;

      if (preserveNewlines && text) {
        // Preserve newlines for blockquote processing
        // Blockquotes need to know where lines break to add blockquote attr per line
        ops.push(createTextOp(text, inheritedAttrs));
      } else if (text && text.trim()) {
        // Default: skip whitespace-only nodes and trim text for clean output
        // This prevents extra spaces in the converted output
        ops.push(createTextOp(text.trim(), inheritedAttrs));
      }
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const childElement = child as Element;
      const tagName = childElement.tagName.toLowerCase();

      // Skip nested lists - they're processed separately by list-item handler
      if (tagName === "ul" || tagName === "ol") continue;

      const style = childElement.getAttribute("style") ?? "";

      // Merge attributes: inherited → tag-based → style-based
      // Later values override earlier ones for same property
      const attrs: SlackTextAttributes = {
        ...inheritedAttrs,
        ...getTagAttributes(tagName, childElement, style, adapter),
        ...extractStyleAttributes(style),
      };

      // Recurse into children with merged attributes
      ops.push(...getFormattedOps(childElement, adapter, attrs, options));
    }
  }

  return ops;
}
