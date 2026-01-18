/**
 * Converter Types
 *
 * Type definitions for the Handler pattern used in the converter module.
 *
 * Design Decision:
 * The converter was refactored from a single 200-line function to a
 * Handler pattern for several reasons:
 * 1. Single Responsibility: Each handler processes one element type
 * 2. Open/Closed: New element types can be added without modifying existing code
 * 3. Testability: Individual handlers can be unit tested in isolation
 * 4. Readability: Each handler is ~50 lines instead of one massive function
 */

import type { ServiceAdapter, SlackTextAttributes, SlackTextOp } from "@/providers/_shared/types";

/**
 * Context passed to block handlers.
 *
 * Provides handlers with access to:
 * - adapter: Provider-specific behavior (list level detection, URL extraction)
 * - walker: TreeWalker for DOM traversal (shared across all handlers)
 * - getFormattedOps: Extract formatted text with inline styles preserved
 * - skipDescendants: Skip child nodes when handler processes entire subtree
 */
export interface HandlerContext {
  readonly adapter: ServiceAdapter;
  readonly walker: TreeWalker;
  /**
   * Extract formatted ops from an element.
   * @param element - The element to process
   * @param options.preserveNewlines - If true, preserve newlines (for blockquotes)
   */
  getFormattedOps(element: Element, options?: { preserveNewlines?: boolean }): SlackTextOp[];
  /**
   * Skip all descendants of a node in TreeWalker.
   * Call this when the handler processes the entire subtree itself.
   */
  skipDescendants(node: Node): void;
}

/**
 * Block handler interface.
 *
 * Each handler is responsible for one type of block element (e.g., blockquote, list item).
 * Handlers are tried in order; the first one where canHandle() returns true processes the element.
 */
export interface BlockHandler {
  /** Handler name for debugging/logging */
  readonly name: string;
  /**
   * Check if this handler can process the given element.
   * Should be a fast check (no DOM traversal).
   */
  canHandle(element: Element): boolean;
  /**
   * Process the element and return SlackTextOps.
   * May call context.skipDescendants() if processing entire subtree.
   */
  handle(element: Element, context: HandlerContext): SlackTextOp[];
}

/**
 * Character info for blockquote line processing.
 *
 * Blockquotes need character-level processing to:
 * 1. Split content into lines
 * 2. Preserve formatting attributes per character
 * 3. Add blockquote attribute to each line's newline
 */
export interface CharInfo {
  char: string;
  attrs?: SlackTextAttributes;
}
