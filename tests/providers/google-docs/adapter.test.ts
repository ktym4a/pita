import { describe, expect, it, beforeEach } from "vitest";

import { GoogleDocsAdapter, googleDocsAdapter } from "@/providers/google-docs/adapter";
import { googleDocsConfig } from "@/providers/google-docs/config";

describe("GoogleDocsAdapter - config", () => {
  let adapter: GoogleDocsAdapter;

  beforeEach(() => {
    adapter = new GoogleDocsAdapter();
  });

  it("should have correct id", () => {
    expect(adapter.id).toBe("google-docs");
  });

  it("should have correct name", () => {
    expect(adapter.name).toBe("Google Docs");
  });

  it("should have correct URL patterns", () => {
    expect(adapter.urlPatterns).toEqual(googleDocsConfig.urlPatterns);
  });

  it("should match docs.google.com URLs", () => {
    const pattern = adapter.urlPatterns[0];
    expect(pattern?.test("https://docs.google.com/document/d/123")).toBe(true);
    expect(pattern?.test("https://docs.google.com/")).toBe(true);
  });

  it("should not match non-google-docs URLs", () => {
    const pattern = adapter.urlPatterns[0];
    expect(pattern?.test("https://google.com")).toBe(false);
    expect(pattern?.test("https://drive.google.com")).toBe(false);
    expect(pattern?.test("https://notion.so")).toBe(false);
  });
});

describe("GoogleDocsAdapter - getListLevel", () => {
  let adapter: GoogleDocsAdapter;

  beforeEach(() => {
    adapter = new GoogleDocsAdapter();
  });

  it("should return aria-level value when present", () => {
    const li = document.createElement("li");
    li.setAttribute("aria-level", "2");
    expect(adapter.getListLevel(li)).toBe(2);
  });

  it("should return 1 when aria-level is not present", () => {
    const li = document.createElement("li");
    expect(adapter.getListLevel(li)).toBe(1);
  });

  it("should handle aria-level of 1", () => {
    const li = document.createElement("li");
    li.setAttribute("aria-level", "1");
    expect(adapter.getListLevel(li)).toBe(1);
  });

  it("should handle high aria-level values", () => {
    const li = document.createElement("li");
    li.setAttribute("aria-level", "5");
    expect(adapter.getListLevel(li)).toBe(5);
  });
});

describe("GoogleDocsAdapter - extractUrl", () => {
  let adapter: GoogleDocsAdapter;

  beforeEach(() => {
    adapter = new GoogleDocsAdapter();
  });

  it("should extract actual URL from Google redirect URL", () => {
    const googleUrl = "https://www.google.com/url?q=https://example.com/page&sa=D";
    expect(adapter.extractUrl(googleUrl)).toBe("https://example.com/page");
  });

  it("should return original URL if not a Google redirect", () => {
    const url = "https://example.com/page";
    expect(adapter.extractUrl(url)).toBe(url);
  });

  it("should handle Google redirect with special characters", () => {
    const googleUrl =
      "https://www.google.com/url?q=https://example.com/page?foo=bar%26baz=qux&sa=D";
    const result = adapter.extractUrl(googleUrl);
    expect(result).toContain("example.com");
  });

  it("should return original URL for malformed Google redirect", () => {
    const malformedUrl = "https://www.google.com/url?invalid";
    expect(adapter.extractUrl(malformedUrl)).toBe(malformedUrl);
  });

  it("should handle URLs without q parameter", () => {
    const googleUrl = "https://www.google.com/url?sa=D&source=editors";
    expect(adapter.extractUrl(googleUrl)).toBe(googleUrl);
  });
});

describe("GoogleDocsAdapter - isWrapperElement", () => {
  let adapter: GoogleDocsAdapter;

  beforeEach(() => {
    adapter = new GoogleDocsAdapter();
  });

  it("should return true for docs-internal-guid elements", () => {
    const element = document.createElement("b");
    element.id = "docs-internal-guid-12345";
    expect(adapter.isWrapperElement(element, "")).toBe(true);
  });

  it("should return true for font-weight: normal style", () => {
    const element = document.createElement("b");
    expect(adapter.isWrapperElement(element, "font-weight: normal;")).toBe(true);
  });

  it("should return true for font-weight: 400 style", () => {
    const element = document.createElement("b");
    expect(adapter.isWrapperElement(element, "font-weight: 400;")).toBe(true);
  });

  it("should return false for regular bold element", () => {
    const element = document.createElement("b");
    expect(adapter.isWrapperElement(element, "")).toBe(false);
  });

  it("should return false for bold style", () => {
    const element = document.createElement("span");
    expect(adapter.isWrapperElement(element, "font-weight: bold;")).toBe(false);
  });
});

describe("googleDocsAdapter singleton", () => {
  it("should be an instance of GoogleDocsAdapter", () => {
    expect(googleDocsAdapter).toBeInstanceOf(GoogleDocsAdapter);
  });

  it("should have correct id", () => {
    expect(googleDocsAdapter.id).toBe("google-docs");
  });
});
