import { describe, expect, it } from "vitest";

import { notionConfig } from "@/providers/notion/config";

describe("notionConfig", () => {
  it("should have correct id", () => {
    expect(notionConfig.id).toBe("notion");
  });

  it("should have correct name", () => {
    expect(notionConfig.name).toBe("Notion");
  });

  it("should have URL patterns that match notion.so", () => {
    const pattern = notionConfig.urlPatterns[0];
    expect(pattern?.test("https://notion.so/")).toBe(true);
    expect(pattern?.test("https://www.notion.so/")).toBe(true);
    expect(pattern?.test("https://notion.so/workspace/page-123")).toBe(true);
  });

  it("should have correct contentScriptMatches", () => {
    expect(notionConfig.contentScriptMatches).toContain("*://*.notion.so/*");
    expect(notionConfig.contentScriptMatches).toContain("*://notion.so/*");
  });

  it("should have correct hostPermissions", () => {
    expect(notionConfig.hostPermissions).toContain("https://www.notion.so/*");
    expect(notionConfig.hostPermissions).toContain("https://notion.so/*");
  });
});
