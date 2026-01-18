/**
 * Block Handlers Registry
 *
 * Exports all block handlers in the order they should be tried.
 *
 * Handler Order Matters:
 * - More specific handlers should come first
 * - List items don't skip descendants (nested lists need processing)
 * - Other handlers skip descendants to prevent double-processing
 *
 * To add a new handler:
 * 1. Create handler file in this directory
 * 2. Import and add to BLOCK_HANDLERS array
 * 3. Consider order relative to existing handlers
 */

import type { BlockHandler } from "../types";

import { blockquoteHandler } from "./blockquote";
import { codeBlockHandler } from "./code-block";
import { divHandler } from "./div";
import { headingHandler } from "./heading";
import { listItemHandler } from "./list-item";
import { paragraphHandler } from "./paragraph";

/**
 * Ordered list of block handlers.
 *
 * Processing order:
 * 1. blockquote - Must come before paragraph (blockquotes may contain <p>)
 * 2. code-block - <pre> elements with code
 * 3. list-item - <li> elements (doesn't skip descendants for nested lists)
 * 4. paragraph - <p> not inside lists
 * 5. heading - <h1>-<h6> elements
 * 6. div - Fallback for div elements with text content
 */
export const BLOCK_HANDLERS: readonly BlockHandler[] = [
  blockquoteHandler,
  codeBlockHandler,
  listItemHandler,
  paragraphHandler,
  headingHandler,
  divHandler,
];

export {
  blockquoteHandler,
  codeBlockHandler,
  listItemHandler,
  paragraphHandler,
  headingHandler,
  divHandler,
};
