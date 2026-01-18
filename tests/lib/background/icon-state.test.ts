// oxlint-disable max-lines-per-function
// oxlint-disable import/max-dependencies
import { describe, expect, it, beforeEach, vi } from "vitest";

// Mock the icon module before importing icon-state
vi.mock("@/lib/background/icon", () => ({
  ICON_SIZES: [16, 32, 48, 96, 128],
  ICON_PATHS: {
    16: "icon/16.png",
    32: "icon/32.png",
    48: "icon/48.png",
    96: "icon/96.png",
    128: "icon/128.png",
  },
  getAllDisabledIcons: vi.fn().mockResolvedValue({
    16: { width: 16, height: 16, data: new Uint8ClampedArray(16 * 16 * 4) },
    32: { width: 32, height: 32, data: new Uint8ClampedArray(32 * 32 * 4) },
    48: { width: 48, height: 48, data: new Uint8ClampedArray(48 * 48 * 4) },
    96: { width: 96, height: 96, data: new Uint8ClampedArray(96 * 96 * 4) },
    128: { width: 128, height: 128, data: new Uint8ClampedArray(128 * 128 * 4) },
  }),
  getDisabledIcon: vi.fn(),
}));

import { ICON_PATHS, ICON_SIZES } from "@/lib/background/icon";
import {
  getMatchingProviderId,
  getTabInfo,
  isIconDisabled,
  applyIconState,
  type TabsApi,
  type ActionApi,
} from "@/lib/background/icon-state";

describe("background icon state", () => {
  describe("getMatchingProviderId", () => {
    it("should return notion for Notion URLs", () => {
      expect(getMatchingProviderId("https://notion.so/page")).toBe("notion");
      expect(getMatchingProviderId("https://www.notion.so/workspace")).toBe("notion");
    });

    it("should return google-docs for Google Docs URLs", () => {
      expect(getMatchingProviderId("https://docs.google.com/document/d/123")).toBe("google-docs");
    });

    it("should return null for unsupported URLs", () => {
      expect(getMatchingProviderId("https://example.com/")).toBeNull();
      expect(getMatchingProviderId("https://google.com/")).toBeNull();
    });

    it("should return null for undefined URL", () => {
      expect(getMatchingProviderId(undefined)).toBeNull();
    });

    it("should return null for empty string", () => {
      expect(getMatchingProviderId("")).toBeNull();
    });
  });

  describe("getTabInfo", () => {
    it("should get active tab when no tabId provided", async () => {
      const mockTabs: TabsApi = {
        query: vi.fn().mockResolvedValue([{ id: 42, url: "https://notion.so/" }]),
        get: vi.fn(),
      };

      const result = await getTabInfo(mockTabs);

      expect(result).toEqual({ url: "https://notion.so/", tabId: 42 });
      expect(mockTabs.query).toHaveBeenCalledWith({ active: true, currentWindow: true });
    });

    it("should get specific tab when tabId provided", async () => {
      const mockTabs: TabsApi = {
        query: vi.fn(),
        get: vi.fn().mockResolvedValue({ id: 7, url: "https://docs.google.com/" }),
      };

      const result = await getTabInfo(mockTabs, 7);

      expect(result).toEqual({ url: "https://docs.google.com/", tabId: 7 });
      expect(mockTabs.get).toHaveBeenCalledWith(7);
    });

    it("should return null when tab does not exist", async () => {
      const mockTabs: TabsApi = {
        query: vi.fn(),
        get: vi.fn().mockRejectedValue(new Error("Tab not found")),
      };

      const result = await getTabInfo(mockTabs, 999);

      expect(result).toBeNull();
    });

    it("should handle undefined values in active tab query", async () => {
      const mockTabs: TabsApi = {
        query: vi.fn().mockResolvedValue([{}]),
        get: vi.fn(),
      };

      const result = await getTabInfo(mockTabs);

      expect(result).toEqual({ url: undefined, tabId: undefined });
    });

    it("should handle empty query result", async () => {
      const mockTabs: TabsApi = {
        query: vi.fn().mockResolvedValue([]),
        get: vi.fn(),
      };

      const result = await getTabInfo(mockTabs);

      expect(result).toEqual({ url: undefined, tabId: undefined });
    });
  });

  describe("isIconDisabled", () => {
    const enabledProviders = {
      notion: { enabled: true },
      "google-docs": { enabled: true },
    };

    it("should return true when global is disabled", () => {
      expect(isIconDisabled(false, "https://notion.so/", enabledProviders)).toBe(true);
    });

    it("should return true for unsupported URL", () => {
      expect(isIconDisabled(true, "https://example.com/", enabledProviders)).toBe(true);
    });

    it("should return true when provider is disabled", () => {
      const disabledProviders = {
        notion: { enabled: false },
        "google-docs": { enabled: true },
      };

      expect(isIconDisabled(true, "https://notion.so/", disabledProviders)).toBe(true);
    });

    it("should return false for supported URL with enabled provider", () => {
      expect(isIconDisabled(true, "https://notion.so/", enabledProviders)).toBe(false);
    });

    it("should return false for Google Docs with enabled provider", () => {
      expect(isIconDisabled(true, "https://docs.google.com/document", enabledProviders)).toBe(
        false,
      );
    });

    it("should return true when provider is missing from settings", () => {
      expect(isIconDisabled(true, "https://notion.so/", {})).toBe(true);
    });
  });

  describe("applyIconState", () => {
    let mockAction: ActionApi;

    beforeEach(() => {
      mockAction = {
        setIcon: vi.fn().mockResolvedValue(undefined),
      };
    });

    it("should set disabled icon when disabled is true", async () => {
      await applyIconState(mockAction, 1, true);

      expect(mockAction.setIcon).toHaveBeenCalledWith(
        expect.objectContaining({
          imageData: expect.any(Object),
          tabId: 1,
        }),
      );
    });

    it("should set normal icon when disabled is false", async () => {
      await applyIconState(mockAction, 1, false);

      expect(mockAction.setIcon).toHaveBeenCalledWith({
        path: ICON_PATHS,
        tabId: 1,
      });
    });
  });

  describe("ICON_PATHS", () => {
    it("should have all required sizes", () => {
      for (const size of ICON_SIZES) {
        expect(ICON_PATHS).toHaveProperty(String(size));
      }
    });

    it("should use correct path format", () => {
      expect(ICON_PATHS[16]).toBe("icon/16.png");
      expect(ICON_PATHS[128]).toBe("icon/128.png");
    });
  });
});
