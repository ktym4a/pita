// oxlint-disable import/max-dependencies
// oxlint-disable max-lines-per-function
import { describe, expect, it, beforeEach, vi } from "vitest";

// Mock the icon module before importing badge
vi.mock("@/lib/background/icon", () => ({
  ICON_SIZES: [16, 32, 48, 96, 128],
  ICON_PATHS_FOR_API: {
    16: "icon/16.png",
    32: "icon/32.png",
    48: "icon/48.png",
    96: "icon/96.png",
    128: "icon/128.png",
  },
  getAllGrayscaleIcons: vi.fn().mockResolvedValue({
    16: { width: 16, height: 16, data: new Uint8ClampedArray(16 * 16 * 4) },
    32: { width: 32, height: 32, data: new Uint8ClampedArray(32 * 32 * 4) },
    48: { width: 48, height: 48, data: new Uint8ClampedArray(48 * 48 * 4) },
    96: { width: 96, height: 96, data: new Uint8ClampedArray(96 * 96 * 4) },
    128: { width: 128, height: 128, data: new Uint8ClampedArray(128 * 128 * 4) },
  }),
  getGrayscaleIcon: vi.fn(),
  clearIconCache: vi.fn(),
}));

import {
  getMatchingProviderId,
  getTabInfo,
  determineBadgeState,
  applyBadgeState,
  type BadgeState,
  type TabsApi,
  type ActionApi,
} from "@/lib/background/badge";
import { ICON_PATHS_FOR_API, ICON_SIZES } from "@/lib/background/icon";

describe("background badge", () => {
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

  describe("determineBadgeState", () => {
    const enabledProviders = {
      notion: { enabled: true },
      "google-docs": { enabled: true },
    };

    it("should return - state when global is disabled", () => {
      const result = determineBadgeState(false, "https://notion.so/", enabledProviders);

      expect(result).toEqual({
        text: "-",
        color: "#6B7280",
        useGrayIcon: true,
      });
    });

    it("should return dash state for unsupported URL", () => {
      const result = determineBadgeState(true, "https://example.com/", enabledProviders);

      expect(result).toEqual({
        text: "–",
        color: "#6B7280",
        useGrayIcon: true,
      });
    });

    it("should return - state when provider is disabled", () => {
      const disabledProviders = {
        notion: { enabled: false },
        "google-docs": { enabled: true },
      };

      const result = determineBadgeState(true, "https://notion.so/", disabledProviders);

      expect(result).toEqual({
        text: "-",
        color: "#6B7280",
        useGrayIcon: true,
      });
    });

    it("should return enabled state for supported URL with enabled provider", () => {
      const result = determineBadgeState(true, "https://notion.so/", enabledProviders);

      expect(result).toEqual({
        text: "",
        color: "",
        useGrayIcon: false,
      });
    });

    it("should return enabled state for Google Docs", () => {
      const result = determineBadgeState(
        true,
        "https://docs.google.com/document",
        enabledProviders,
      );

      expect(result).toEqual({
        text: "",
        color: "",
        useGrayIcon: false,
      });
    });

    it("should handle missing provider in settings", () => {
      const result = determineBadgeState(true, "https://notion.so/", {});

      expect(result).toEqual({
        text: "-",
        color: "#6B7280",
        useGrayIcon: true,
      });
    });
  });

  describe("applyBadgeState", () => {
    let mockAction: ActionApi;

    beforeEach(() => {
      mockAction = {
        setBadgeText: vi.fn().mockResolvedValue(undefined),
        setBadgeBackgroundColor: vi.fn().mockResolvedValue(undefined),
        setIcon: vi.fn().mockResolvedValue(undefined),
      };
    });

    it("should set badge text", async () => {
      const state: BadgeState = { text: "OFF", color: "#6B7280", useGrayIcon: true };

      await applyBadgeState(mockAction, 1, state);

      expect(mockAction.setBadgeText).toHaveBeenCalledWith({ text: "OFF", tabId: 1 });
    });

    it("should set badge color when provided", async () => {
      const state: BadgeState = { text: "OFF", color: "#6B7280", useGrayIcon: true };

      await applyBadgeState(mockAction, 1, state);

      expect(mockAction.setBadgeBackgroundColor).toHaveBeenCalledWith({
        color: "#6B7280",
        tabId: 1,
      });
    });

    it("should not set badge color when empty", async () => {
      const state: BadgeState = { text: "", color: "", useGrayIcon: false };

      await applyBadgeState(mockAction, 1, state);

      expect(mockAction.setBadgeBackgroundColor).not.toHaveBeenCalled();
    });

    it("should set grayscale icon using imageData when disabled", async () => {
      const state: BadgeState = { text: "OFF", color: "#6B7280", useGrayIcon: true };

      await applyBadgeState(mockAction, 1, state);

      expect(mockAction.setIcon).toHaveBeenCalledWith(
        expect.objectContaining({
          imageData: expect.any(Object),
          tabId: 1,
        }),
      );
    });

    it("should set normal icon using path when enabled", async () => {
      const state: BadgeState = { text: "", color: "", useGrayIcon: false };

      await applyBadgeState(mockAction, 1, state);

      expect(mockAction.setIcon).toHaveBeenCalledWith({
        path: ICON_PATHS_FOR_API,
        tabId: 1,
      });
    });
  });

  describe("ICON_PATHS_FOR_API", () => {
    it("should have all required sizes", () => {
      for (const size of ICON_SIZES) {
        expect(ICON_PATHS_FOR_API).toHaveProperty(String(size));
      }
    });

    it("should use correct path format", () => {
      expect(ICON_PATHS_FOR_API[16]).toBe("icon/16.png");
      expect(ICON_PATHS_FOR_API[128]).toBe("icon/128.png");
    });
  });
});
