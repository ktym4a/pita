import { describe, expect, it, beforeEach } from "vitest";

import { NotionAdapter, notionAdapter } from "@/providers/notion/adapter";
import { notionConfig } from "@/providers/notion/config";

describe("NotionAdapter - config", () => {
  let adapter: NotionAdapter;

  beforeEach(() => {
    adapter = new NotionAdapter();
  });

  it("should have correct id", () => {
    expect(adapter.id).toBe("notion");
  });

  it("should have correct name", () => {
    expect(adapter.name).toBe("Notion");
  });

  it("should have correct URL patterns", () => {
    expect(adapter.urlPatterns).toEqual(notionConfig.urlPatterns);
  });

  it("should match notion.so URLs", () => {
    const pattern = adapter.urlPatterns[0];
    expect(pattern?.test("https://notion.so/page")).toBe(true);
    expect(pattern?.test("https://www.notion.so/page")).toBe(true);
    expect(pattern?.test("https://notion.so/")).toBe(true);
  });

  it("should not match non-notion URLs", () => {
    const pattern = adapter.urlPatterns[0];
    expect(pattern?.test("https://google.com")).toBe(false);
    expect(pattern?.test("https://notnotion.so")).toBe(false);
  });
});

describe("NotionAdapter - getListLevel basic", () => {
  let adapter: NotionAdapter;

  beforeEach(() => {
    adapter = new NotionAdapter();
  });

  it("should return 1 for top-level list item", () => {
    const ul = document.createElement("ul");
    const li = document.createElement("li");
    li.textContent = "Item";
    ul.appendChild(li);
    document.body.appendChild(ul);

    expect(adapter.getListLevel(li)).toBe(1);
    document.body.removeChild(ul);
  });

  it("should return 2 for nested list item", () => {
    const ul1 = document.createElement("ul");
    const li1 = document.createElement("li");
    const ul2 = document.createElement("ul");
    const li2 = document.createElement("li");

    li2.textContent = "Nested";
    ul2.appendChild(li2);
    li1.appendChild(ul2);
    ul1.appendChild(li1);
    document.body.appendChild(ul1);

    expect(adapter.getListLevel(li2)).toBe(2);
    document.body.removeChild(ul1);
  });

  it("should return 1 for element without list parent", () => {
    const div = document.createElement("div");
    div.textContent = "Not in list";
    document.body.appendChild(div);

    expect(adapter.getListLevel(div)).toBe(1);
    document.body.removeChild(div);
  });
});

describe("NotionAdapter - getListLevel deep nesting", () => {
  let adapter: NotionAdapter;

  beforeEach(() => {
    adapter = new NotionAdapter();
  });

  it("should return 3 for deeply nested list item", () => {
    const ul1 = document.createElement("ul");
    const li1 = document.createElement("li");
    const ul2 = document.createElement("ul");
    const li2 = document.createElement("li");
    const ul3 = document.createElement("ul");
    const li3 = document.createElement("li");

    li3.textContent = "Deep";
    ul3.appendChild(li3);
    li2.appendChild(ul3);
    ul2.appendChild(li2);
    li1.appendChild(ul2);
    ul1.appendChild(li1);
    document.body.appendChild(ul1);

    expect(adapter.getListLevel(li3)).toBe(3);
    document.body.removeChild(ul1);
  });

  it("should count both ul and ol elements", () => {
    const ol = document.createElement("ol");
    const li1 = document.createElement("li");
    const ul = document.createElement("ul");
    const li2 = document.createElement("li");

    li2.textContent = "Mixed";
    ul.appendChild(li2);
    li1.appendChild(ul);
    ol.appendChild(li1);
    document.body.appendChild(ol);

    expect(adapter.getListLevel(li2)).toBe(2);
    document.body.removeChild(ol);
  });
});

describe("NotionAdapter - extractUrl and isWrapperElement", () => {
  let adapter: NotionAdapter;

  beforeEach(() => {
    adapter = new NotionAdapter();
  });

  it("should return URL as-is (default behavior)", () => {
    const url = "https://example.com/page";
    expect(adapter.extractUrl(url)).toBe(url);
  });

  it("should return false for isWrapperElement (default behavior)", () => {
    const element = document.createElement("b");
    expect(adapter.isWrapperElement(element, "")).toBe(false);
  });
});

describe("notionAdapter singleton", () => {
  it("should be an instance of NotionAdapter", () => {
    expect(notionAdapter).toBeInstanceOf(NotionAdapter);
  });

  it("should have correct id", () => {
    expect(notionAdapter.id).toBe("notion");
  });
});
