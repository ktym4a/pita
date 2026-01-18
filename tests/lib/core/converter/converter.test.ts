import { describe, expect, it } from "vitest";

import type { SlackTextOp } from "@/providers/_shared/types";
import type { ServiceAdapter } from "@/providers/_shared/types";

import { containsLists, convertToPlainText, convertToSlackTexty } from "@/lib/core/converter";

/**
 * Create a mock adapter for testing.
 * @returns {ServiceAdapter} Mock adapter instance
 */
function createMockAdapter(): ServiceAdapter {
  return {
    id: "test",
    name: "Test",
    urlPatterns: [],
    contentScriptMatches: [],
    getListLevel: (node: Element) => {
      let level = 0;
      let parent = node.parentElement;
      while (parent) {
        const tag = parent.tagName.toLowerCase();
        if (tag === "ul" || tag === "ol") {
          level++;
        }
        parent = parent.parentElement;
      }
      return level || 1;
    },
    extractUrl: (href: string) => href,
    isWrapperElement: () => false,
    setupEventListeners: () => {},
    cleanup: () => {},
  };
}

/**
 * Find a list newline operation without indent.
 * @param {SlackTextOp[]} ops - Operations to search
 * @param {string} listType - List type (bullet or ordered)
 * @returns {SlackTextOp | undefined} Matching operation
 */
function findListNewlineWithoutIndent(
  ops: SlackTextOp[],
  listType: string,
): SlackTextOp | undefined {
  for (const op of ops) {
    if (op.insert === "\n" && op.attributes?.list === listType && !op.attributes.indent) {
      return op;
    }
  }
  return undefined;
}

/**
 * Find a list newline operation with specific indent.
 * @param {SlackTextOp[]} ops - Operations to search
 * @param {string} listType - List type (bullet or ordered)
 * @param {number} indent - Indent level
 * @returns {SlackTextOp | undefined} Matching operation
 */
function findListNewlineWithIndent(
  ops: SlackTextOp[],
  listType: string,
  indent: number,
): SlackTextOp | undefined {
  for (const op of ops) {
    if (op.insert === "\n" && op.attributes?.list === listType && op.attributes.indent === indent) {
      return op;
    }
  }
  return undefined;
}

/**
 * Find a newline operation with specific indent (any list type).
 * @param {SlackTextOp[]} ops - Operations to search
 * @param {number} indent - Indent level
 * @returns {SlackTextOp | undefined} Matching operation
 */
function findNewlineWithIndent(ops: SlackTextOp[], indent: number): SlackTextOp | undefined {
  for (const op of ops) {
    if (op.insert === "\n" && op.attributes?.indent === indent) {
      return op;
    }
  }
  return undefined;
}

/**
 * Find an operation with specific list attribute.
 * @param {SlackTextOp[]} ops - Operations to search
 * @param {string} listType - List type to find
 * @returns {SlackTextOp | undefined} Matching operation
 */
function findOpWithListType(ops: SlackTextOp[], listType: string): SlackTextOp | undefined {
  for (const op of ops) {
    if (op.attributes?.list === listType) {
      return op;
    }
  }
  return undefined;
}

const mockAdapter = createMockAdapter();

describe("containsLists", () => {
  it("should detect list elements", () => {
    expect(containsLists("<ul><li>item</li></ul>")).toBe(true);
    expect(containsLists("<li>item</li>")).toBe(true);
    expect(containsLists('<li class="test">item</li>')).toBe(true);
  });

  it("should return false for non-list content", () => {
    expect(containsLists("<p>paragraph</p>")).toBe(false);
    expect(containsLists("<div>div</div>")).toBe(false);
    expect(containsLists("plain text")).toBe(false);
  });
});

describe("convertToSlackTexty - basic lists", () => {
  it("should convert simple bullet list", () => {
    const html = "<ul><li>Item 1</li><li>Item 2</li></ul>";
    const result = convertToSlackTexty(html, mockAdapter);

    expect(result.ops).toEqual([
      { insert: "Item 1" },
      { attributes: { list: "bullet" }, insert: "\n" },
      { insert: "Item 2" },
      { attributes: { list: "bullet" }, insert: "\n" },
    ]);
  });

  it("should convert ordered list", () => {
    const html = "<ol><li>First</li><li>Second</li></ol>";
    const result = convertToSlackTexty(html, mockAdapter);

    expect(result.ops).toEqual([
      { insert: "First" },
      { attributes: { list: "ordered" }, insert: "\n" },
      { insert: "Second" },
      { attributes: { list: "ordered" }, insert: "\n" },
    ]);
  });

  it("should handle mixed bullet and ordered lists", () => {
    const html = `
      <ul><li>Bullet</li></ul>
      <ol><li>Ordered</li></ol>
    `;
    const result = convertToSlackTexty(html, mockAdapter);

    const bulletOp = findOpWithListType(result.ops, "bullet");
    const orderedOp = findOpWithListType(result.ops, "ordered");

    expect(bulletOp).toBeDefined();
    expect(orderedOp).toBeDefined();
  });
});

describe("convertToSlackTexty - nested lists", () => {
  it("should handle nested lists with indent", () => {
    const html = `
      <ul>
        <li>Parent
          <ul>
            <li>Child</li>
          </ul>
        </li>
      </ul>
    `;
    const result = convertToSlackTexty(html, mockAdapter);

    const parentOp = findListNewlineWithoutIndent(result.ops, "bullet");
    expect(parentOp).toBeDefined();

    const childOp = findNewlineWithIndent(result.ops, 1);
    expect(childOp).toBeDefined();
  });

  it("should handle deeply nested ordered lists", () => {
    const html = `
      <ol>
        <li>Level 1
          <ol>
            <li>Level 2
              <ol>
                <li>Level 3</li>
              </ol>
            </li>
          </ol>
        </li>
      </ol>
    `;
    const result = convertToSlackTexty(html, mockAdapter);

    const level1 = findListNewlineWithoutIndent(result.ops, "ordered");
    expect(level1).toBeDefined();

    const level2 = findListNewlineWithIndent(result.ops, "ordered", 1);
    expect(level2).toBeDefined();

    const level3 = findListNewlineWithIndent(result.ops, "ordered", 2);
    expect(level3).toBeDefined();
  });
});

describe("convertToPlainText", () => {
  it("should convert list to plain text", () => {
    const html = "<ul><li>Item 1</li><li>Item 2</li></ul>";
    const result = convertToPlainText(html);

    expect(result).toContain("• Item 1");
    expect(result).toContain("• Item 2");
  });

  it("should convert paragraph to plain text", () => {
    const html = "<p>Paragraph text</p>";
    const result = convertToPlainText(html);

    expect(result).toContain("Paragraph text");
  });
});
