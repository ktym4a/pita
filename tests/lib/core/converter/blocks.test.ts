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

describe("convertToSlackTexty - paragraphs", () => {
  it("should handle paragraphs", () => {
    const html = "<p>Paragraph text</p>";
    const result = convertToSlackTexty(html, mockAdapter);

    expect(result.ops).toEqual([{ insert: "Paragraph text" }, { insert: "\n" }]);
  });
});

describe("convertToSlackTexty - blockquotes", () => {
  it("should handle blockquotes", () => {
    const html = "<blockquote>Quote text</blockquote>";
    const result = convertToSlackTexty(html, mockAdapter);

    expect(result.ops).toEqual([
      { insert: "Quote text" },
      { attributes: { blockquote: true }, insert: "\n" },
    ]);
  });

  it("should handle multi-line blockquotes with formatting", () => {
    const html = `<blockquote><p>bold<strong>bold</strong>bold
italic<em>italic</em>italic
plain text</p></blockquote>`;
    const result = convertToSlackTexty(html, mockAdapter);

    expect(result.ops).toContainEqual({ insert: "bold" });
    expect(result.ops).toContainEqual({
      insert: "bold",
      attributes: { bold: true },
    });

    expect(result.ops).toContainEqual({
      insert: "italic",
      attributes: { italic: true },
    });

    const blockquoteNewlines = result.ops.filter((op) => op.attributes?.blockquote === true);
    expect(blockquoteNewlines.length).toBe(3);
  });
});

describe("convertToSlackTexty - code blocks", () => {
  it("should handle code blocks", () => {
    const html = "<pre><code>const x = 1;</code></pre>";
    const result = convertToSlackTexty(html, mockAdapter);

    expect(result.ops).toEqual([
      { insert: "const x = 1;" },
      { attributes: { "code-block": true }, insert: "\n" },
    ]);
  });

  it("should handle multi-line code blocks", () => {
    const html = `<pre><code class="language-js">line1
line2
line3</code></pre>`;
    const result = convertToSlackTexty(html, mockAdapter);

    expect(result.ops).toEqual([
      { insert: "line1" },
      { attributes: { "code-block": true }, insert: "\n" },
      { insert: "line2" },
      { attributes: { "code-block": true }, insert: "\n" },
      { insert: "line3" },
      { attributes: { "code-block": true }, insert: "\n" },
    ]);
  });

  it("should handle code blocks with trailing newline in source", () => {
    const html = `<pre><code>code
</code></pre>`;
    const result = convertToSlackTexty(html, mockAdapter);

    expect(result.ops).toEqual([
      { insert: "code" },
      { attributes: { "code-block": true }, insert: "\n" },
    ]);
  });

  it("should handle inline code with surrounding text", () => {
    const html = "<p><code>code</code> and text</p>";
    const result = convertToSlackTexty(html, mockAdapter);

    expect(result.ops).toContainEqual({
      insert: "code",
      attributes: { code: true },
    });
    expect(result.ops).toContainEqual({ insert: "and text" });
  });
});

describe("convertToSlackTexty - headings", () => {
  it("should handle headings", () => {
    const html = "<h1>Heading 1</h1><h2>Heading 2</h2>";
    const result = convertToSlackTexty(html, mockAdapter);

    expect(result.ops).toContainEqual({ insert: "Heading 1" });
    expect(result.ops).toContainEqual({ insert: "Heading 2" });
  });
});

describe("convertToSlackTexty - div", () => {
  it("should handle div with text content", () => {
    const html = "<div>Div content</div>";
    const result = convertToSlackTexty(html, mockAdapter);

    expect(result.ops).toContainEqual({ insert: "Div content" });
  });
});
