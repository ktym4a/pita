/**
 * HTML to Slack Markdown Converter
 *
 * Converts HTML copied from Notion/Google Docs to Slack-compatible markdown.
 * Used when Slack's rich text editor is turned OFF and users type in plain text.
 *
 * Design:
 * Uses recursive DOM traversal (like convertToPlainText) rather than
 * the TreeWalker + Handler pattern used by the Texty converter.
 * A flat string output is simpler to build recursively.
 */

import type { ServiceAdapter } from "@/providers/_shared/types";

import { isOrderedListItem } from "@/providers/_shared/constants";

import {
  type InlineFormatting,
  EMPTY_FORMATTING,
  wrapWithFormatting,
  processInlineContent,
} from "./markdown-inline";

const HEADING_PATTERN = /^h[1-6]$/;

/**
 * Convert a <pre> code block element to fenced code markdown.
 *
 * @param {Element} el - The <pre> element
 * @returns {string} Fenced code block markdown
 */
function processCodeBlock(el: Element): string {
  const codeEl = el.querySelector("code");
  const rawText = codeEl?.textContent ?? el.textContent ?? "";
  let text = rawText.replace(/\s+$/, "");

  // Strip language identifier from first line if present.
  // Some editors (e.g., Notion) include the language name in text content.
  if (codeEl) {
    const langMatch = codeEl.className.match(/language-(\w+)/);
    if (langMatch) {
      const lang = langMatch[1];
      if (text.startsWith(lang + "\n")) {
        text = text.slice(lang.length + 1);
      } else if (text.startsWith(lang)) {
        text = text.slice(lang.length);
      }
    }
  }

  return text ? `\`\`\`\n${text}\n\`\`\`\n` : "";
}

/**
 * Convert a <blockquote> element to quoted markdown lines.
 *
 * Notion puts multiple lines in a single <p> with literal newlines;
 * we preserve those so each line gets a `> ` prefix.
 *
 * @param {Element} el - The <blockquote> element
 * @param {ServiceAdapter} adapter - Provider adapter
 * @param {InlineFormatting} formatting - Current formatting state
 * @returns {string} Blockquote markdown
 */
function processBlockquote(
  el: Element,
  adapter: ServiceAdapter,
  formatting: InlineFormatting,
): string {
  let inner = "";
  for (const child of el.childNodes) {
    if (child.nodeType !== Node.ELEMENT_NODE) continue;

    const childEl = child as Element;
    const childTag = childEl.tagName.toLowerCase();
    if (childTag === "p" || HEADING_PATTERN.test(childTag)) {
      const content = processInlineContent(childEl, adapter, formatting, true).trim();
      if (content) inner += content + "\n";
    } else {
      inner += processElement(childEl, adapter, formatting);
    }
  }
  const lines = inner.split("\n").filter((l) => l.trim());
  return lines.length > 0 ? lines.map((l) => `> ${l}`).join("\n") + "\n" : "";
}

/**
 * Process a list item element into markdown.
 *
 * @param {Element} el - List item element
 * @param {ServiceAdapter} adapter - Provider adapter
 * @param {InlineFormatting} formatting - Current formatting state
 * @returns {string} Markdown for list item and its nested lists
 */
function processListItem(
  el: Element,
  adapter: ServiceAdapter,
  formatting: InlineFormatting,
): string {
  let result = "";
  const level = adapter.getListLevel(el);
  const indent = "    ".repeat(Math.max(0, level - 1));
  const isOrdered = isOrderedListItem(el);
  const prefix = isOrdered ? "1." : "-";
  const content = processInlineContent(el, adapter, formatting).trim();
  if (content) {
    result += `${indent}${prefix} ${content}\n`;
  }
  // Process nested lists inside this list item
  // (processInlineContent skips <ul>/<ol> by design)
  for (const liChild of el.children) {
    if (liChild.tagName.toLowerCase() === "ul" || liChild.tagName.toLowerCase() === "ol") {
      result += processNode(liChild, adapter, formatting);
    }
  }
  return result;
}

/**
 * Process a single element node into markdown.
 *
 * @param {Element} el - Element to process
 * @param {ServiceAdapter} adapter - Provider adapter
 * @param {InlineFormatting} formatting - Current formatting state
 * @returns {string} Markdown string for this element
 */
function processElement(
  el: Element,
  adapter: ServiceAdapter,
  formatting: InlineFormatting,
): string {
  const tag = el.tagName.toLowerCase();

  if (tag === "img") return "";
  if (tag === "pre") return processCodeBlock(el);
  if (tag === "blockquote") return processBlockquote(el, adapter, formatting);
  if (tag === "li") return processListItem(el, adapter, formatting);
  if (tag === "ul" || tag === "ol") return processNode(el, adapter, formatting);
  if (tag === "br") return "\n";

  if (tag === "p" || HEADING_PATTERN.test(tag)) {
    const content = processInlineContent(el, adapter, formatting).trim();
    return content ? content + "\n" : "";
  }

  if (tag === "div") {
    const content = processNode(el, adapter, formatting);
    if (!content.trim()) return "";
    return content.endsWith("\n") ? content : content + "\n";
  }

  // Wrapper elements (e.g., Google Docs <b id="docs-internal-guid-xxx">)
  // act as transparent block containers — recurse with processNode so
  // child block elements (<ul>, <li>, <p>) are handled correctly.
  if (
    (tag === "b" || tag === "strong") &&
    adapter.isWrapperElement(el, el.getAttribute("style") ?? "")
  ) {
    return processNode(el, adapter, formatting);
  }

  // Inline element: recurse with updated formatting
  return processInlineContent(el, adapter, formatting);
}

/**
 * Recursively process DOM nodes to produce Slack markdown.
 *
 * @param {Node} node - DOM node to process
 * @param {ServiceAdapter} adapter - Provider adapter for provider-specific behavior
 * @param {InlineFormatting} formatting - Current inline formatting state
 * @returns {string} Markdown string
 */
function processNode(node: Node, adapter: ServiceAdapter, formatting: InlineFormatting): string {
  let result = "";

  for (const child of node.childNodes) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent?.trim() ?? "";
      if (text) result += wrapWithFormatting(text, formatting);
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      result += processElement(child as Element, adapter, formatting);
    }
  }

  return result;
}

/**
 * Convert HTML to Slack-compatible markdown string.
 *
 * @param {string} html - HTML string from clipboard
 * @param {ServiceAdapter} adapter - Provider-specific adapter for list levels, URL extraction, etc.
 * @returns {string} Slack markdown string
 */
export function convertToSlackMarkdown(html: string, adapter: ServiceAdapter): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  return processNode(doc.body, adapter, EMPTY_FORMATTING);
}
