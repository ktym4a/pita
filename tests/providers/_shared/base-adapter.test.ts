import { describe, expect, it, beforeEach, vi } from "vitest";

import type { ProviderConfig } from "@/providers/_shared/types";

import { BaseAdapter } from "@/providers/_shared/base-adapter";

// Concrete implementation for testing
class TestAdapter extends BaseAdapter {
  getListLevel(_node: Element): number {
    return 1;
  }
}

const testConfig: ProviderConfig = {
  id: "test",
  name: "Test Provider",
  urlPatterns: [/^https:\/\/test\.com\//],
  contentScriptMatches: ["*://test.com/*"],
  hostPermissions: ["https://test.com/*"],
};

describe("BaseAdapter - constructor", () => {
  let adapter: TestAdapter;

  beforeEach(() => {
    adapter = new TestAdapter(testConfig);
  });

  it("should set id from config", () => {
    expect(adapter.id).toBe("test");
  });

  it("should set name from config", () => {
    expect(adapter.name).toBe("Test Provider");
  });

  it("should set urlPatterns from config", () => {
    expect(adapter.urlPatterns).toEqual(testConfig.urlPatterns);
  });
});

describe("BaseAdapter - extractUrl", () => {
  let adapter: TestAdapter;

  beforeEach(() => {
    adapter = new TestAdapter(testConfig);
  });

  it("should return URL as-is by default", () => {
    const url = "https://example.com/page";
    expect(adapter.extractUrl(url)).toBe(url);
  });

  it("should handle empty string", () => {
    expect(adapter.extractUrl("")).toBe("");
  });

  it("should handle complex URLs", () => {
    const url = "https://example.com/page?foo=bar&baz=qux#section";
    expect(adapter.extractUrl(url)).toBe(url);
  });
});

describe("BaseAdapter - isWrapperElement", () => {
  let adapter: TestAdapter;

  beforeEach(() => {
    adapter = new TestAdapter(testConfig);
  });

  it("should return false by default", () => {
    const element = document.createElement("div");
    expect(adapter.isWrapperElement(element, "")).toBe(false);
  });

  it("should return false regardless of style", () => {
    const element = document.createElement("b");
    expect(adapter.isWrapperElement(element, "font-weight: bold;")).toBe(false);
  });
});

describe("BaseAdapter - setupEventListeners", () => {
  let adapter: TestAdapter;

  beforeEach(() => {
    adapter = new TestAdapter(testConfig);
  });

  it("should add keydown event listener", () => {
    const addEventListenerSpy = vi.spyOn(document, "addEventListener");
    const handler = vi.fn();

    adapter.setupEventListeners(handler);

    expect(addEventListenerSpy).toHaveBeenCalledWith("keydown", handler, true);

    addEventListenerSpy.mockRestore();
  });
});

describe("BaseAdapter - cleanup", () => {
  let adapter: TestAdapter;

  beforeEach(() => {
    adapter = new TestAdapter(testConfig);
  });

  it("should remove keydown event listener", () => {
    const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");
    const handler = vi.fn();

    adapter.setupEventListeners(handler);
    adapter.cleanup();

    expect(removeEventListenerSpy).toHaveBeenCalledWith("keydown", handler, true);

    removeEventListenerSpy.mockRestore();
  });

  it("should handle cleanup when no listener was set", () => {
    expect(() => adapter.cleanup()).not.toThrow();
  });

  it("should allow multiple cleanups", () => {
    const handler = vi.fn();
    adapter.setupEventListeners(handler);

    expect(() => {
      adapter.cleanup();
      adapter.cleanup();
    }).not.toThrow();
  });
});

describe("BaseAdapter - abstract getListLevel", () => {
  let adapter: TestAdapter;

  beforeEach(() => {
    adapter = new TestAdapter(testConfig);
  });

  it("should be implemented by subclass", () => {
    const element = document.createElement("li");
    expect(typeof adapter.getListLevel(element)).toBe("number");
  });
});
