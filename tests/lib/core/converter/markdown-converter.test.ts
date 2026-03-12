import { describe, expect, it } from "vitest";

import { convertToSlackMarkdown } from "@/lib/core/converter";
import type { ServiceAdapter } from "@/providers/_shared/types";

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

// oxlint-disable-next-line max-lines-per-function
describe("convertToSlackMarkdown - inline formatting", () => {
  it("should convert bold text", () => {
    const html = "<p><b>bold</b></p>";
    const result = convertToSlackMarkdown(html, mockAdapter);
    expect(result).toBe("*bold*\n");
  });

  it("should convert strong text", () => {
    const html = "<p><strong>bold</strong></p>";
    const result = convertToSlackMarkdown(html, mockAdapter);
    expect(result).toBe("*bold*\n");
  });

  it("should convert italic text", () => {
    const html = "<p><i>italic</i></p>";
    const result = convertToSlackMarkdown(html, mockAdapter);
    expect(result).toBe("_italic_\n");
  });

  it("should convert em text", () => {
    const html = "<p><em>italic</em></p>";
    const result = convertToSlackMarkdown(html, mockAdapter);
    expect(result).toBe("_italic_\n");
  });

  it("should convert strikethrough text", () => {
    const html = "<p><s>strike</s></p>";
    const result = convertToSlackMarkdown(html, mockAdapter);
    expect(result).toBe("~strike~\n");
  });

  it("should convert del text", () => {
    const html = "<p><del>deleted</del></p>";
    const result = convertToSlackMarkdown(html, mockAdapter);
    expect(result).toBe("~deleted~\n");
  });

  it("should convert inline code", () => {
    const html = "<p><code>code</code></p>";
    const result = convertToSlackMarkdown(html, mockAdapter);
    expect(result).toBe("`code`\n");
  });

  it("should convert links", () => {
    const html = '<p><a href="https://example.com">link text</a></p>';
    const result = convertToSlackMarkdown(html, mockAdapter);
    expect(result).toBe("[link text](https://example.com)\n");
  });

  it("should handle mixed formatting", () => {
    const html = "<p>plain <b>bold</b> and <i>italic</i></p>";
    const result = convertToSlackMarkdown(html, mockAdapter);
    expect(result).toBe("plain *bold* and _italic_\n");
  });

  it("should handle nested formatting (bold + italic)", () => {
    const html = "<p><b><i>bold italic</i></b></p>";
    const result = convertToSlackMarkdown(html, mockAdapter);
    expect(result).toBe("*_bold italic_*\n");
  });

  it("should handle style-based bold", () => {
    const html = '<p><span style="font-weight: bold;">styled bold</span></p>';
    const result = convertToSlackMarkdown(html, mockAdapter);
    expect(result).toBe("*styled bold*\n");
  });

  it("should handle style-based italic", () => {
    const html = '<p><span style="font-style: italic;">styled italic</span></p>';
    const result = convertToSlackMarkdown(html, mockAdapter);
    expect(result).toBe("_styled italic_\n");
  });
});

// oxlint-disable-next-line max-lines-per-function
describe("convertToSlackMarkdown - lists", () => {
  it("should convert bullet list", () => {
    const html = "<ul><li>Item 1</li><li>Item 2</li></ul>";
    const result = convertToSlackMarkdown(html, mockAdapter);
    expect(result).toBe("- Item 1\n- Item 2\n");
  });

  it("should convert ordered list", () => {
    const html = "<ol><li>First</li><li>Second</li></ol>";
    const result = convertToSlackMarkdown(html, mockAdapter);
    expect(result).toBe("1. First\n1. Second\n");
  });

  it("should handle nested bullet lists", () => {
    const html = `
      <ul>
        <li>Parent
          <ul>
            <li>Child</li>
          </ul>
        </li>
      </ul>
    `;
    const result = convertToSlackMarkdown(html, mockAdapter);
    expect(result).toContain("- Parent\n");
    expect(result).toContain("    - Child\n");
  });

  it("should handle deeply nested lists", () => {
    const html = `
      <ul>
        <li>Level 1
          <ul>
            <li>Level 2
              <ul>
                <li>Level 3</li>
              </ul>
            </li>
          </ul>
        </li>
      </ul>
    `;
    const result = convertToSlackMarkdown(html, mockAdapter);
    expect(result).toContain("- Level 1\n");
    expect(result).toContain("    - Level 2\n");
    expect(result).toContain("        - Level 3\n");
  });

  it("should handle formatted text in list items", () => {
    const html = "<ul><li><b>bold item</b></li></ul>";
    const result = convertToSlackMarkdown(html, mockAdapter);
    expect(result).toBe("- *bold item*\n");
  });
});

describe("convertToSlackMarkdown - code blocks", () => {
  it("should convert pre/code blocks", () => {
    const html = "<pre><code>const x = 1;</code></pre>";
    const result = convertToSlackMarkdown(html, mockAdapter);
    expect(result).toBe("```\nconst x = 1;\n```\n");
  });

  it("should convert pre without code", () => {
    const html = "<pre>plain code</pre>";
    const result = convertToSlackMarkdown(html, mockAdapter);
    expect(result).toBe("```\nplain code\n```\n");
  });

  it("should handle multiline code blocks", () => {
    const html = "<pre><code>line 1\nline 2\nline 3</code></pre>";
    const result = convertToSlackMarkdown(html, mockAdapter);
    expect(result).toBe("```\nline 1\nline 2\nline 3\n```\n");
  });

  it("should strip language identifier from code blocks", () => {
    const html = '<pre><code class="language-jsx">jsx\nconst x = 1;</code></pre>';
    const result = convertToSlackMarkdown(html, mockAdapter);
    expect(result).toBe("```\nconst x = 1;\n```\n");
  });

  it("should strip language identifier without newline", () => {
    const html = '<pre><code class="language-python">pythonprint("hello")</code></pre>';
    const result = convertToSlackMarkdown(html, mockAdapter);
    expect(result).toBe('```\nprint("hello")\n```\n');
  });

  it("should keep code content when no language class", () => {
    const html = "<pre><code>jsx\nconst x = 1;</code></pre>";
    const result = convertToSlackMarkdown(html, mockAdapter);
    expect(result).toBe("```\njsx\nconst x = 1;\n```\n");
  });
});

describe("convertToSlackMarkdown - blockquotes", () => {
  it("should convert blockquotes", () => {
    const html = "<blockquote><p>quoted text</p></blockquote>";
    const result = convertToSlackMarkdown(html, mockAdapter);
    expect(result).toContain("> quoted text");
  });

  it("should handle multiline blockquotes", () => {
    const html = "<blockquote><p>line 1</p><p>line 2</p></blockquote>";
    const result = convertToSlackMarkdown(html, mockAdapter);
    expect(result).toContain("> line 1");
    expect(result).toContain("> line 2");
  });

  it("should preserve newlines within single <p> in blockquotes (Notion format)", () => {
    const html = `<blockquote>
<p>bold<strong>bold</strong>bold
italic<em>italic</em>italic
underunderunder
remove<s>remove</s>remove</p>
</blockquote>`;
    const result = convertToSlackMarkdown(html, mockAdapter);
    expect(result).toBe(
      "> bold *bold* bold\n> italic _italic_ italic\n> underunderunder\n> remove ~remove~ remove\n",
    );
  });

  it("should handle blockquote with formatting on each line", () => {
    const html = "<blockquote><p>plain\n<b>bold line</b></p></blockquote>";
    const result = convertToSlackMarkdown(html, mockAdapter);
    expect(result).toContain("> plain");
    expect(result).toContain("> *bold line*");
  });
});

describe("convertToSlackMarkdown - headings and paragraphs", () => {
  it("should convert paragraphs", () => {
    const html = "<p>paragraph text</p>";
    const result = convertToSlackMarkdown(html, mockAdapter);
    expect(result).toBe("paragraph text\n");
  });

  it("should convert headings as plain text", () => {
    const html = "<h1>Heading</h1>";
    const result = convertToSlackMarkdown(html, mockAdapter);
    expect(result).toBe("Heading\n");
  });

  it("should convert multiple paragraphs", () => {
    const html = "<p>First</p><p>Second</p>";
    const result = convertToSlackMarkdown(html, mockAdapter);
    expect(result).toBe("First\nSecond\n");
  });
});

describe("convertToSlackMarkdown - images", () => {
  it("should ignore img elements", () => {
    const html = '<p>before<img src="test.png" alt="test">after</p>';
    const result = convertToSlackMarkdown(html, mockAdapter);
    expect(result).toBe("beforeafter\n");
  });

  it("should ignore img in paragraphs with other content", () => {
    const html = '<p>text <img src="test.png"> more text</p>';
    const result = convertToSlackMarkdown(html, mockAdapter);
    expect(result).toBe("text more text\n");
  });
});

describe("convertToSlackMarkdown - divs and br", () => {
  it("should handle div elements", () => {
    const html = "<div>content</div>";
    const result = convertToSlackMarkdown(html, mockAdapter);
    expect(result).toContain("content");
  });

  it("should handle empty content gracefully", () => {
    const html = "<p></p>";
    const result = convertToSlackMarkdown(html, mockAdapter);
    expect(result).toBe("");
  });
});
