// oxlint-disable import/max-dependencies
import { describe, expect, it, vi, beforeEach, type Mock } from "vitest";
import type { ContentScriptContext } from "wxt/utils/content-script-context";

import * as factory from "@/lib/core/content-script-factory";
import type { ServiceAdapter } from "@/providers/_shared/types";

vi.mock("@/lib/core/clipboard", () => ({
  isCopyShortcut: vi.fn(),
  waitForClipboard: vi.fn(),
  readClipboardHtml: vi.fn(),
}));

vi.mock("@/lib/core/process-copy", () => ({
  processAndWrite: vi.fn(),
}));

vi.mock("@/lib/storage/settings", () => ({
  getOutputMode: vi.fn(),
}));

vi.mock("@/lib/ui/notification", () => ({
  initNotification: vi.fn().mockResolvedValue(undefined),
  showNotification: vi.fn(),
}));

import * as clipboard from "@/lib/core/clipboard";
import * as processCopy from "@/lib/core/process-copy";
import * as settings from "@/lib/storage/settings";
import * as notification from "@/lib/ui/notification";

function createMockAdapter(): ServiceAdapter {
  return {
    id: "test-provider",
    name: "Test Provider",
    urlPatterns: [],
    contentScriptMatches: [],
    getListLevel: () => 1,
    extractUrl: (href: string) => href,
    isWrapperElement: () => false,
    setupEventListeners: vi.fn(),
    cleanup: vi.fn(),
  };
}

function createMockContext(): ContentScriptContext {
  return { isInvalid: false, onInvalidated: vi.fn() } as unknown as ContentScriptContext;
}

function setupMocks(
  overrides: {
    isCopyShortcut?: boolean;
    clipboardHtml?: string | null;
    outputMode?: "texty" | "markdown";
    processAndWriteResult?: boolean;
  } = {},
): void {
  (clipboard.isCopyShortcut as Mock).mockReturnValue(overrides.isCopyShortcut ?? true);
  (clipboard.waitForClipboard as Mock).mockResolvedValue(undefined);
  (clipboard.readClipboardHtml as Mock).mockResolvedValue(
    "clipboardHtml" in overrides ? overrides.clipboardHtml : "<p>test</p>",
  );
  (processCopy.processAndWrite as Mock).mockReturnValue(overrides.processAndWriteResult ?? true);
  (settings.getOutputMode as Mock).mockResolvedValue(overrides.outputMode ?? "texty");
}

// oxlint-disable-next-line max-lines-per-function
describe("content-script-factory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("initialization", () => {
    it("should initialize notification and return handler", async () => {
      setupMocks();
      const ctx = createMockContext();
      const handler = await factory.createContentScriptHandler({
        adapter: createMockAdapter(),
        notificationMessages: { texty: "Test", markdown: "Markdown Test" },
        ctx,
      });

      expect(notification.initNotification).toHaveBeenCalledWith(ctx);
      expect(typeof handler).toBe("function");
    });
  });

  // oxlint-disable-next-line max-lines-per-function
  describe("copy handling", () => {
    it("should skip non-copy shortcuts", async () => {
      setupMocks({ isCopyShortcut: false });
      const handler = await factory.createContentScriptHandler({
        adapter: createMockAdapter(),
        notificationMessages: { texty: "Test", markdown: "Markdown Test" },
        ctx: createMockContext(),
      });

      await handler(new KeyboardEvent("keydown"));

      expect(clipboard.readClipboardHtml).not.toHaveBeenCalled();
    });

    it("should skip when clipboard is empty", async () => {
      setupMocks({ clipboardHtml: null });
      const handler = await factory.createContentScriptHandler({
        adapter: createMockAdapter(),
        notificationMessages: { texty: "Test", markdown: "Markdown Test" },
        ctx: createMockContext(),
      });

      await handler(new KeyboardEvent("keydown"));

      expect(processCopy.processAndWrite).not.toHaveBeenCalled();
    });

    it("should skip notification when processAndWrite returns false", async () => {
      setupMocks({ processAndWriteResult: false });
      const handler = await factory.createContentScriptHandler({
        adapter: createMockAdapter(),
        notificationMessages: { texty: "Test", markdown: "Markdown Test" },
        ctx: createMockContext(),
      });

      await handler(new KeyboardEvent("keydown"));

      expect(processCopy.processAndWrite).toHaveBeenCalled();
      expect(notification.showNotification).not.toHaveBeenCalled();
    });

    it("should call processAndWrite and show notification on success", async () => {
      setupMocks();
      const adapter = createMockAdapter();
      const handler = await factory.createContentScriptHandler({
        adapter,
        notificationMessages: { texty: "Copied!", markdown: "Markdown Copied!" },
        ctx: createMockContext(),
      });

      await handler(new KeyboardEvent("keydown"));

      expect(processCopy.processAndWrite).toHaveBeenCalledWith("<p>test</p>", adapter, "texty");
      expect(notification.showNotification).toHaveBeenCalledWith("Copied!");
    });
  });

  describe("markdown mode", () => {
    it("should show markdown notification when output mode is markdown", async () => {
      setupMocks({ outputMode: "markdown" });
      const adapter = createMockAdapter();
      const handler = await factory.createContentScriptHandler({
        adapter,
        notificationMessages: { texty: "Texty!", markdown: "Markdown!" },
        ctx: createMockContext(),
      });

      await handler(new KeyboardEvent("keydown"));

      expect(processCopy.processAndWrite).toHaveBeenCalledWith("<p>test</p>", adapter, "markdown");
      expect(notification.showNotification).toHaveBeenCalledWith("Markdown!");
    });

    it("should show texty notification when output mode is texty", async () => {
      setupMocks({ outputMode: "texty" });
      const handler = await factory.createContentScriptHandler({
        adapter: createMockAdapter(),
        notificationMessages: { texty: "Texty!", markdown: "Markdown!" },
        ctx: createMockContext(),
      });

      await handler(new KeyboardEvent("keydown"));

      expect(notification.showNotification).toHaveBeenCalledWith("Texty!");
    });
  });

  describe("htmlFilter option", () => {
    it("should skip when filter returns false in texty mode", async () => {
      setupMocks({ outputMode: "texty" });
      const htmlFilter = vi.fn().mockReturnValue(false);
      const handler = await factory.createContentScriptHandler({
        adapter: createMockAdapter(),
        notificationMessages: { texty: "Test", markdown: "Markdown Test" },
        ctx: createMockContext(),
        htmlFilter,
      });

      await handler(new KeyboardEvent("keydown"));

      expect(htmlFilter).toHaveBeenCalledWith("<p>test</p>");
      expect(processCopy.processAndWrite).not.toHaveBeenCalled();
    });

    it("should process when filter returns true in texty mode", async () => {
      setupMocks({ outputMode: "texty" });
      const htmlFilter = vi.fn().mockReturnValue(true);
      const handler = await factory.createContentScriptHandler({
        adapter: createMockAdapter(),
        notificationMessages: { texty: "Test", markdown: "Markdown Test" },
        ctx: createMockContext(),
        htmlFilter,
      });

      await handler(new KeyboardEvent("keydown"));

      expect(processCopy.processAndWrite).toHaveBeenCalled();
    });

    it("should bypass htmlFilter in markdown mode", async () => {
      setupMocks({ outputMode: "markdown" });
      const htmlFilter = vi.fn().mockReturnValue(false);
      const handler = await factory.createContentScriptHandler({
        adapter: createMockAdapter(),
        notificationMessages: { texty: "Test", markdown: "Markdown Test" },
        ctx: createMockContext(),
        htmlFilter,
      });

      await handler(new KeyboardEvent("keydown"));

      // Filter should NOT be called in markdown mode
      expect(htmlFilter).not.toHaveBeenCalled();
      expect(processCopy.processAndWrite).toHaveBeenCalled();
    });
  });
});
