import type { ContentScriptContext } from "wxt/utils/content-script-context";

// oxlint-disable import/max-dependencies
import { describe, expect, it, vi, beforeEach, type Mock } from "vitest";

import type { ServiceAdapter } from "@/providers/_shared/types";

import * as factory from "@/lib/core/content-script-factory";

vi.mock("@/lib/core/clipboard", () => ({
  isCopyShortcut: vi.fn(),
  waitForClipboard: vi.fn(),
  readClipboardHtml: vi.fn(),
  writeSlackTexty: vi.fn(),
}));

vi.mock("@/lib/core/converter", () => ({
  convertToSlackTexty: vi.fn(),
  convertToPlainText: vi.fn(),
}));

vi.mock("@/lib/ui/notification", () => ({
  initNotification: vi.fn().mockResolvedValue(undefined),
  showNotification: vi.fn(),
}));

import * as clipboard from "@/lib/core/clipboard";
import * as converter from "@/lib/core/converter";
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
    slackTextyOps?: Array<{ insert: string }>;
  } = {},
): void {
  (clipboard.isCopyShortcut as Mock).mockReturnValue(overrides.isCopyShortcut ?? true);
  (clipboard.waitForClipboard as Mock).mockResolvedValue(undefined);
  (clipboard.readClipboardHtml as Mock).mockResolvedValue(
    "clipboardHtml" in overrides ? overrides.clipboardHtml : "<p>test</p>",
  );
  (converter.convertToSlackTexty as Mock).mockReturnValue({
    ops: overrides.slackTextyOps ?? [{ insert: "test" }],
  });
  (converter.convertToPlainText as Mock).mockReturnValue("test");
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
        notificationMessage: "Test",
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
        notificationMessage: "Test",
        ctx: createMockContext(),
      });

      await handler(new KeyboardEvent("keydown"));

      expect(clipboard.readClipboardHtml).not.toHaveBeenCalled();
    });

    it("should skip when clipboard is empty", async () => {
      setupMocks({ clipboardHtml: null });
      const handler = await factory.createContentScriptHandler({
        adapter: createMockAdapter(),
        notificationMessage: "Test",
        ctx: createMockContext(),
      });

      await handler(new KeyboardEvent("keydown"));

      expect(converter.convertToSlackTexty).not.toHaveBeenCalled();
    });

    it("should skip when conversion produces empty ops", async () => {
      setupMocks({ slackTextyOps: [] });
      const handler = await factory.createContentScriptHandler({
        adapter: createMockAdapter(),
        notificationMessage: "Test",
        ctx: createMockContext(),
      });

      await handler(new KeyboardEvent("keydown"));

      expect(clipboard.writeSlackTexty).not.toHaveBeenCalled();
      expect(notification.showNotification).not.toHaveBeenCalled();
    });

    it("should convert and write to clipboard on success", async () => {
      setupMocks();
      const adapter = createMockAdapter();
      const handler = await factory.createContentScriptHandler({
        adapter,
        notificationMessage: "Copied!",
        ctx: createMockContext(),
      });

      await handler(new KeyboardEvent("keydown"));

      expect(converter.convertToSlackTexty).toHaveBeenCalledWith("<p>test</p>", adapter);
      expect(clipboard.writeSlackTexty).toHaveBeenCalled();
      expect(notification.showNotification).toHaveBeenCalledWith("Copied!");
    });
  });

  describe("htmlFilter option", () => {
    it("should skip when filter returns false", async () => {
      setupMocks();
      const htmlFilter = vi.fn().mockReturnValue(false);
      const handler = await factory.createContentScriptHandler({
        adapter: createMockAdapter(),
        notificationMessage: "Test",
        ctx: createMockContext(),
        htmlFilter,
      });

      await handler(new KeyboardEvent("keydown"));

      expect(htmlFilter).toHaveBeenCalledWith("<p>test</p>");
      expect(converter.convertToSlackTexty).not.toHaveBeenCalled();
    });

    it("should process when filter returns true", async () => {
      setupMocks();
      const htmlFilter = vi.fn().mockReturnValue(true);
      const handler = await factory.createContentScriptHandler({
        adapter: createMockAdapter(),
        notificationMessage: "Test",
        ctx: createMockContext(),
        htmlFilter,
      });

      await handler(new KeyboardEvent("keydown"));

      expect(converter.convertToSlackTexty).toHaveBeenCalled();
    });
  });
});
