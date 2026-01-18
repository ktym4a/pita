/**
 * Notion Adapter
 *
 * Handles Notion-specific behavior for copy interception.
 *
 * Notion HTML Structure:
 * - Lists use nested <ul>/<ol> elements for indentation
 * - List level = count of parent <ul>/<ol> elements
 * - No special URL wrapping
 * - No wrapper elements for bold
 */

import { BaseAdapter } from "@/providers/_shared/base-adapter";

import { notionConfig } from "./config";

export class NotionAdapter extends BaseAdapter {
  constructor() {
    super(notionConfig);
  }

  /**
   * Get list nesting level by counting parent ul/ol elements.
   *
   * Notion uses nested list elements for indentation:
   * ```html
   * <ul>
   *   <li>Level 1
   *     <ul>
   *       <li>Level 2</li>
   *     </ul>
   *   </li>
   * </ul>
   * ```
   *
   * @param {Element} node - List item element
   * @returns {number} Number of parent list elements (minimum 1)
   */
  getListLevel(node: Element): number {
    let level = 0;
    let parent = node.parentElement;
    while (parent) {
      const tag = parent.tagName.toLowerCase();
      if (tag === "ul" || tag === "ol") {
        level++;
      }
      parent = parent.parentElement;
    }
    // Return at least 1 even if no list parents found (shouldn't happen)
    return level || 1;
  }
}

export const notionAdapter = new NotionAdapter();
