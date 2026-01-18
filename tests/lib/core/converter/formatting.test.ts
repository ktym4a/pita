import { describe, expect, it } from "vitest";

import type { ServiceAdapter } from "@/providers/_shared/types";

import { convertToSlackTexty } from "@/lib/core/converter";

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

const mockAdapter = createMockAdapter();

describe("convertToSlackTexty - bold formatting", () => {
  it("should preserve bold formatting", () => {
    const html = "<ul><li><b>Bold text</b></li></ul>";
    const result = convertToSlackTexty(html, mockAdapter);

    expect(result.ops).toContainEqual({
      insert: "Bold text",
      attributes: { bold: true },
    });
  });

  it("should handle style-based bold formatting", () => {
    const html = '<ul><li><span style="font-weight: bold;">Bold</span></li></ul>';
    const result = convertToSlackTexty(html, mockAdapter);

    expect(result.ops).toContainEqual({
      insert: "Bold",
      attributes: { bold: true },
    });
  });

  it("should handle strong tag for bold", () => {
    const html = "<ul><li><strong>strong</strong></li></ul>";
    const result = convertToSlackTexty(html, mockAdapter);

    expect(result.ops).toContainEqual({
      insert: "strong",
      attributes: { bold: true },
    });
  });
});

describe("convertToSlackTexty - italic formatting", () => {
  it("should preserve italic formatting", () => {
    const html = "<ul><li><i>Italic text</i></li></ul>";
    const result = convertToSlackTexty(html, mockAdapter);

    expect(result.ops).toContainEqual({
      insert: "Italic text",
      attributes: { italic: true },
    });
  });

  it("should handle style-based italic", () => {
    const html = '<ul><li><span style="font-style: italic;">Italic</span></li></ul>';
    const result = convertToSlackTexty(html, mockAdapter);

    expect(result.ops).toContainEqual({
      insert: "Italic",
      attributes: { italic: true },
    });
  });

  it("should handle em tag for italic", () => {
    const html = "<ul><li><em>emphasized</em></li></ul>";
    const result = convertToSlackTexty(html, mockAdapter);

    expect(result.ops).toContainEqual({
      insert: "emphasized",
      attributes: { italic: true },
    });
  });
});

describe("convertToSlackTexty - strikethrough formatting", () => {
  it("should preserve strikethrough formatting", () => {
    const html = "<ul><li><s>deleted</s></li></ul>";
    const result = convertToSlackTexty(html, mockAdapter);

    expect(result.ops).toContainEqual({
      insert: "deleted",
      attributes: { strike: true },
    });
  });

  it("should handle del tag for strikethrough", () => {
    const html = "<ul><li><del>removed</del></li></ul>";
    const result = convertToSlackTexty(html, mockAdapter);

    expect(result.ops).toContainEqual({
      insert: "removed",
      attributes: { strike: true },
    });
  });

  it("should handle style-based strikethrough", () => {
    const html = '<ul><li><span style="text-decoration: line-through;">Strike</span></li></ul>';
    const result = convertToSlackTexty(html, mockAdapter);

    expect(result.ops).toContainEqual({
      insert: "Strike",
      attributes: { strike: true },
    });
  });
});

describe("convertToSlackTexty - other formatting", () => {
  it("should preserve links", () => {
    const html = '<ul><li><a href="https://example.com">Link</a></li></ul>';
    const result = convertToSlackTexty(html, mockAdapter);

    expect(result.ops).toContainEqual({
      insert: "Link",
      attributes: { link: "https://example.com" },
    });
  });

  it("should preserve code formatting", () => {
    const html = "<ul><li><code>code</code></li></ul>";
    const result = convertToSlackTexty(html, mockAdapter);

    expect(result.ops).toContainEqual({
      insert: "code",
      attributes: { code: true },
    });
  });

  it("should handle mixed formatting in list items", () => {
    const html = "<ul><li>normal<strong>bold</strong>normal<em>italic</em>normal</li></ul>";
    const result = convertToSlackTexty(html, mockAdapter);

    expect(result.ops).toContainEqual({ insert: "normal" });
    expect(result.ops).toContainEqual({
      insert: "bold",
      attributes: { bold: true },
    });
    expect(result.ops).toContainEqual({
      insert: "italic",
      attributes: { italic: true },
    });
  });
});
