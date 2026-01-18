import { describe, expect, it } from "vitest";

import { googleDocsConfig } from "@/providers/google-docs/config";

describe("googleDocsConfig", () => {
  it("should have correct id", () => {
    expect(googleDocsConfig.id).toBe("google-docs");
  });

  it("should have correct name", () => {
    expect(googleDocsConfig.name).toBe("Google Docs");
  });

  it("should have URL patterns that match docs.google.com", () => {
    const pattern = googleDocsConfig.urlPatterns[0];
    expect(pattern?.test("https://docs.google.com/")).toBe(true);
    expect(pattern?.test("https://docs.google.com/document/d/123")).toBe(true);
    expect(pattern?.test("https://docs.google.com/document/d/123/edit")).toBe(true);
  });

  it("should not match other Google domains", () => {
    const pattern = googleDocsConfig.urlPatterns[0];
    expect(pattern?.test("https://drive.google.com/")).toBe(false);
    expect(pattern?.test("https://sheets.google.com/")).toBe(false);
    expect(pattern?.test("https://google.com/")).toBe(false);
  });

  it("should have correct contentScriptMatches", () => {
    expect(googleDocsConfig.contentScriptMatches).toContain("*://docs.google.com/*");
  });

  it("should have correct hostPermissions", () => {
    expect(googleDocsConfig.hostPermissions).toContain("https://docs.google.com/*");
  });
});
