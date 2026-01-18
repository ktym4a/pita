import { describe, expect, it } from "vitest";

import { INLINE_TAGS, ORDERED_LIST_PATTERNS, STYLE_PATTERNS } from "@/providers/_shared/constants";

describe("INLINE_TAGS", () => {
  it("should contain all expected inline tags", () => {
    expect(INLINE_TAGS).toContain("span");
    expect(INLINE_TAGS).toContain("a");
    expect(INLINE_TAGS).toContain("b");
    expect(INLINE_TAGS).toContain("i");
    expect(INLINE_TAGS).toContain("u");
    expect(INLINE_TAGS).toContain("s");
    expect(INLINE_TAGS).toContain("em");
    expect(INLINE_TAGS).toContain("strong");
    expect(INLINE_TAGS).toContain("code");
    expect(INLINE_TAGS).toContain("del");
    expect(INLINE_TAGS).toContain("strike");
  });

  it("should have correct length", () => {
    expect(INLINE_TAGS.length).toBe(11);
  });
});

describe("ORDERED_LIST_PATTERNS", () => {
  it("should contain expected patterns", () => {
    expect(ORDERED_LIST_PATTERNS).toContain("decimal");
    expect(ORDERED_LIST_PATTERNS).toContain("number");
    expect(ORDERED_LIST_PATTERNS).toContain("alpha");
    expect(ORDERED_LIST_PATTERNS).toContain("roman");
  });

  it("should have correct length", () => {
    expect(ORDERED_LIST_PATTERNS.length).toBe(4);
  });
});

describe("STYLE_PATTERNS - bold pattern", () => {
  it("should match font-weight: bold", () => {
    expect(STYLE_PATTERNS.bold.test("font-weight: bold;")).toBe(true);
    expect(STYLE_PATTERNS.bold.test("font-weight:bold")).toBe(true);
  });

  it("should match font-weight: 700/800/900", () => {
    expect(STYLE_PATTERNS.bold.test("font-weight: 700;")).toBe(true);
    expect(STYLE_PATTERNS.bold.test("font-weight: 800;")).toBe(true);
    expect(STYLE_PATTERNS.bold.test("font-weight: 900;")).toBe(true);
  });

  it("should not match font-weight: normal/400", () => {
    expect(STYLE_PATTERNS.bold.test("font-weight: normal;")).toBe(false);
    expect(STYLE_PATTERNS.bold.test("font-weight: 400;")).toBe(false);
  });

  it("should be case insensitive", () => {
    expect(STYLE_PATTERNS.bold.test("font-weight: BOLD;")).toBe(true);
    expect(STYLE_PATTERNS.bold.test("FONT-WEIGHT: bold;")).toBe(true);
  });
});

describe("STYLE_PATTERNS - boldNormal pattern", () => {
  it("should match font-weight: normal", () => {
    expect(STYLE_PATTERNS.boldNormal.test("font-weight: normal;")).toBe(true);
    expect(STYLE_PATTERNS.boldNormal.test("font-weight:normal")).toBe(true);
  });

  it("should match font-weight: 400", () => {
    expect(STYLE_PATTERNS.boldNormal.test("font-weight: 400;")).toBe(true);
    expect(STYLE_PATTERNS.boldNormal.test("font-weight:400")).toBe(true);
  });

  it("should not match font-weight: bold", () => {
    expect(STYLE_PATTERNS.boldNormal.test("font-weight: bold;")).toBe(false);
  });
});

describe("STYLE_PATTERNS - italic pattern", () => {
  it("should match font-style: italic", () => {
    expect(STYLE_PATTERNS.italic.test("font-style: italic;")).toBe(true);
    expect(STYLE_PATTERNS.italic.test("font-style:italic")).toBe(true);
  });

  it("should not match font-style: normal", () => {
    expect(STYLE_PATTERNS.italic.test("font-style: normal;")).toBe(false);
  });

  it("should be case insensitive", () => {
    expect(STYLE_PATTERNS.italic.test("font-style: ITALIC;")).toBe(true);
  });
});

describe("STYLE_PATTERNS - underline pattern", () => {
  it("should match text-decoration: underline", () => {
    expect(STYLE_PATTERNS.underline.test("text-decoration: underline;")).toBe(true);
  });

  it("should match text-decoration-line: underline", () => {
    expect(STYLE_PATTERNS.underline.test("text-decoration-line: underline;")).toBe(true);
  });

  it("should match border-bottom (Notion underline)", () => {
    expect(STYLE_PATTERNS.underline.test("border-bottom: 1px solid;")).toBe(true);
  });

  it("should not match text-decoration: none", () => {
    expect(STYLE_PATTERNS.underline.test("text-decoration: none;")).toBe(false);
  });
});

describe("STYLE_PATTERNS - strikethrough pattern", () => {
  it("should match text-decoration: line-through", () => {
    expect(STYLE_PATTERNS.strikethrough.test("text-decoration: line-through;")).toBe(true);
  });

  it("should match text-decoration-line: line-through", () => {
    expect(STYLE_PATTERNS.strikethrough.test("text-decoration-line: line-through;")).toBe(true);
  });

  it("should not match text-decoration: underline", () => {
    expect(STYLE_PATTERNS.strikethrough.test("text-decoration: underline;")).toBe(false);
  });
});
