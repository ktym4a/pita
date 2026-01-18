/**
 * Converter Utilities
 *
 * Helper functions shared across the converter module.
 */

import type { SlackTextAttributes, SlackTextOp } from "@/providers/_shared/types";

/**
 * Build text operation with optional attributes.
 *
 * Creates a SlackTextOp with clean attribute handling:
 * - If attrs is empty, returns { insert: text } (no attributes key)
 * - If attrs has values, returns { insert: text, attributes: {...} }
 *
 * This ensures the output is clean and matches Slack's expected format.
 *
 * @param {string} text - Text content to insert
 * @param {SlackTextAttributes} attrs - Formatting attributes
 * @returns {SlackTextOp} Text operation object
 */
export function createTextOp(text: string, attrs: SlackTextAttributes): SlackTextOp {
  if (Object.keys(attrs).length > 0) {
    return { insert: text, attributes: { ...attrs } };
  }
  return { insert: text };
}

/**
 * Skip all descendants of a node in TreeWalker.
 *
 * When a handler processes an entire subtree (e.g., blockquote, code block),
 * it needs to skip descendant nodes to prevent double-processing.
 *
 * Algorithm:
 * 1. Keep calling nextNode() while the current node is inside the target
 * 2. When we find a node outside the target, step back one
 * 3. This positions the walker at the last descendant, ready for the next iteration
 *
 * Note: This is necessary because TreeWalker doesn't have a "skipChildren" method.
 *
 * @param {TreeWalker} walker - TreeWalker instance
 * @param {Node} node - Node whose descendants to skip
 */
export function skipDescendants(walker: TreeWalker, node: Node): void {
  let next = walker.nextNode();
  while (next && node.contains(next)) {
    next = walker.nextNode();
  }
  // Step back if we went past the subtree
  if (next && !node.contains(next)) {
    walker.previousNode();
  }
}
