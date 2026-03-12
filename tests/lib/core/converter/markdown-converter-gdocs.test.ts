import { describe, expect, it } from "vitest";

import type { ServiceAdapter } from "@/providers/_shared/types";

import { convertToSlackMarkdown } from "@/lib/core/converter";

function createGoogleDocsAdapter(): ServiceAdapter {
  return {
    id: "google-docs",
    name: "Google Docs",
    urlPatterns: [],
    contentScriptMatches: [],
    getListLevel: (node: Element) => {
      const ariaLevel = node.getAttribute("aria-level");
      if (ariaLevel) return parseInt(ariaLevel, 10);
      return 1;
    },
    extractUrl: (href: string) => {
      if (!href.includes("google.com/url")) return href;
      try {
        const url = new URL(href);
        return url.searchParams.get("q") ?? href;
      } catch {
        return href;
      }
    },
    isWrapperElement: (element: Element, style: string) =>
      element.id?.startsWith("docs-internal-guid") || /font-weight:\s*normal/i.test(style),
    setupEventListeners: () => {},
    cleanup: () => {},
  };
}

const googleDocsAdapter = createGoogleDocsAdapter();

// oxlint-disable-next-line max-lines-per-function
describe("convertToSlackMarkdown - Google Docs wrapper handling", () => {
  it("should process lists inside docs-internal-guid wrapper", () => {
    const html = `
      <b id="docs-internal-guid-12345" style="font-weight: normal;">
        <ul>
          <li dir="ltr" aria-level="1">
            <p><span>Item 1</span></p>
          </li>
          <li dir="ltr" aria-level="1">
            <p><span>Item 2</span></p>
          </li>
        </ul>
      </b>
    `;
    const result = convertToSlackMarkdown(html, googleDocsAdapter);
    expect(result).toContain("- Item 1\n");
    expect(result).toContain("- Item 2\n");
  });

  it("should handle formatted text with spaces in Google Docs list items", () => {
    const html = `
      <b id="docs-internal-guid-12345" style="font-weight: normal;">
        <ul>
          <li dir="ltr" aria-level="1">
            <p><span>plain </span><span style="font-weight: 700;">bold</span><span> plain</span></p>
          </li>
        </ul>
      </b>
    `;
    const result = convertToSlackMarkdown(html, googleDocsAdapter);
    expect(result).toContain("plain *bold* plain");
  });

  it("should handle multiple formatting types in Google Docs", () => {
    const html = `
      <b id="docs-internal-guid-12345" style="font-weight: normal;">
        <ul>
          <li dir="ltr" aria-level="1">
            <p><span>bold</span><span style="font-weight: 700;">bold</span><span>bold</span></p>
          </li>
          <li dir="ltr" aria-level="1">
            <p><span>italic</span><span style="font-style: italic;">italic</span><span>italic</span></p>
          </li>
          <li dir="ltr" aria-level="1">
            <p><span>remove</span><span style="text-decoration: line-through;">remove</span><span>remove</span></p>
          </li>
        </ul>
      </b>
    `;
    const result = convertToSlackMarkdown(html, googleDocsAdapter);
    expect(result).toContain("- bold *bold* bold\n");
    expect(result).toContain("- italic _italic_ italic\n");
    expect(result).toContain("- remove ~remove~ remove\n");
  });

  it("should handle Google Docs links with redirect URL", () => {
    const html = `
      <b id="docs-internal-guid-12345" style="font-weight: normal;">
        <ul>
          <li dir="ltr" aria-level="1">
            <p>
              <span>link</span>
              <a href="https://www.google.com/url?q=https://example.com&sa=D">link</a>
              <span>link</span>
            </p>
          </li>
        </ul>
      </b>
    `;
    const result = convertToSlackMarkdown(html, googleDocsAdapter);
    expect(result).toContain("[link](https://example.com)");
  });

  it("should not treat normal <b> tags as wrappers", () => {
    const html = "<p><b>actual bold</b></p>";
    const result = convertToSlackMarkdown(html, googleDocsAdapter);
    expect(result).toBe("*actual bold*\n");
  });
});

// oxlint-disable-next-line max-lines-per-function
describe("convertToSlackMarkdown - Google Docs paragraphs (non-list)", () => {
  it("should convert paragraphs with style-based bold inside wrapper", () => {
    const html = `
      <b id="docs-internal-guid-12345" style="font-weight: normal;">
        <p dir="ltr"><span style="font-weight:400;">bold</span><span style="font-weight:700;">bold</span><span style="font-weight:400;">bold</span></p>
      </b>
    `;
    const result = convertToSlackMarkdown(html, googleDocsAdapter);
    expect(result).toBe("bold *bold* bold\n");
  });

  it("should convert paragraphs with italic inside wrapper", () => {
    const html = `
      <b id="docs-internal-guid-12345" style="font-weight: normal;">
        <p dir="ltr"><span style="font-weight:400;">text</span><span style="font-style:italic;">italic</span><span style="font-weight:400;">text</span></p>
      </b>
    `;
    const result = convertToSlackMarkdown(html, googleDocsAdapter);
    expect(result).toBe("text _italic_ text\n");
  });

  it("should convert paragraphs with strikethrough inside wrapper", () => {
    const html = `
      <b id="docs-internal-guid-12345" style="font-weight: normal;">
        <p dir="ltr"><span style="font-weight:400;">text</span><span style="text-decoration:line-through;">strike</span><span style="font-weight:400;">text</span></p>
      </b>
    `;
    const result = convertToSlackMarkdown(html, googleDocsAdapter);
    expect(result).toBe("text ~strike~ text\n");
  });

  it("should convert paragraphs with links inside wrapper", () => {
    const html = `
      <b id="docs-internal-guid-12345" style="font-weight: normal;">
        <p dir="ltr">
          <span style="font-weight:400;">text</span>
          <a href="https://www.google.com/url?q=https://example.com&amp;sa=D"><span style="color:#1155cc;">link</span></a>
          <span style="font-weight:400;">text</span>
        </p>
      </b>
    `;
    const result = convertToSlackMarkdown(html, googleDocsAdapter);
    expect(result).toContain("text");
    expect(result).toContain("[link](https://example.com)");
  });

  it("should convert multiple paragraphs inside wrapper", () => {
    const html = `
      <b id="docs-internal-guid-12345" style="font-weight: normal;">
        <p dir="ltr"><span style="font-weight:400;">bold</span><span style="font-weight:700;">bold</span><span style="font-weight:400;">bold</span></p>
        <p dir="ltr"><span style="font-weight:400;">italic</span><span style="font-style:italic;">italic</span><span style="font-weight:400;">italic</span></p>
        <p dir="ltr"><span style="font-weight:400;">strike</span><span style="text-decoration:line-through;">strike</span><span style="font-weight:400;">strike</span></p>
      </b>
    `;
    const result = convertToSlackMarkdown(html, googleDocsAdapter);
    expect(result).toBe("bold *bold* bold\nitalic _italic_ italic\nstrike ~strike~ strike\n");
  });

  it("should handle mixed paragraphs and lists inside wrapper", () => {
    const html = `
      <b id="docs-internal-guid-12345" style="font-weight: normal;">
        <p dir="ltr"><span style="font-weight:400;">paragraph</span></p>
        <ul>
          <li dir="ltr" aria-level="1"><p><span>list item</span></p></li>
        </ul>
        <p dir="ltr"><span style="font-weight:400;">another paragraph</span></p>
      </b>
    `;
    const result = convertToSlackMarkdown(html, googleDocsAdapter);
    expect(result).toContain("paragraph\n");
    expect(result).toContain("- list item\n");
    expect(result).toContain("another paragraph\n");
  });
});
