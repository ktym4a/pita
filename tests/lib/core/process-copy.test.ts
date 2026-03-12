// oxlint-disable import/max-dependencies
import { describe, expect, it, vi, beforeEach, type Mock } from "vitest";

import type { ServiceAdapter } from "@/providers/_shared/types";

vi.mock("@/lib/core/clipboard", () => ({
  writePlainText: vi.fn().mockResolvedValue(undefined),
  writeSlackTexty: vi.fn(),
}));

vi.mock("@/lib/core/converter", () => ({
  convertToSlackTexty: vi.fn(),
  convertToPlainText: vi.fn(),
  convertToSlackMarkdown: vi.fn(),
}));

import * as clipboard from "@/lib/core/clipboard";
import * as converter from "@/lib/core/converter";
import { processAndWrite } from "@/lib/core/process-copy";

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

// oxlint-disable-next-line max-lines-per-function
describe("process-copy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("texty mode", () => {
    it("should convert and write slack texty on success", async () => {
      const adapter = createMockAdapter();
      (converter.convertToSlackTexty as Mock).mockReturnValue({
        ops: [{ insert: "test" }],
      });
      (converter.convertToPlainText as Mock).mockReturnValue("test");

      const result = await processAndWrite("<p>test</p>", adapter, "texty");

      expect(result).toBe(true);
      expect(converter.convertToSlackTexty).toHaveBeenCalledWith("<p>test</p>", adapter);
      expect(converter.convertToPlainText).toHaveBeenCalledWith("<p>test</p>");
      expect(clipboard.writeSlackTexty).toHaveBeenCalledWith("test", { ops: [{ insert: "test" }] });
    });

    it("should return false when conversion produces empty ops", async () => {
      (converter.convertToSlackTexty as Mock).mockReturnValue({ ops: [] });

      const result = await processAndWrite("<p></p>", createMockAdapter(), "texty");

      expect(result).toBe(false);
      expect(clipboard.writeSlackTexty).not.toHaveBeenCalled();
    });
  });

  describe("markdown mode", () => {
    it("should convert and write plain text on success", async () => {
      const adapter = createMockAdapter();
      (converter.convertToSlackMarkdown as Mock).mockReturnValue("*bold*\n");

      const result = await processAndWrite("<b>bold</b>", adapter, "markdown");

      expect(result).toBe(true);
      expect(converter.convertToSlackMarkdown).toHaveBeenCalledWith("<b>bold</b>", adapter);
      expect(clipboard.writePlainText).toHaveBeenCalledWith("*bold*\n");
    });

    it("should return false when markdown result is empty", async () => {
      (converter.convertToSlackMarkdown as Mock).mockReturnValue("   ");

      const result = await processAndWrite("<p></p>", createMockAdapter(), "markdown");

      expect(result).toBe(false);
      expect(clipboard.writePlainText).not.toHaveBeenCalled();
    });

    it("should not call texty converter", async () => {
      (converter.convertToSlackMarkdown as Mock).mockReturnValue("text\n");

      await processAndWrite("<p>text</p>", createMockAdapter(), "markdown");

      expect(converter.convertToSlackTexty).not.toHaveBeenCalled();
      expect(clipboard.writeSlackTexty).not.toHaveBeenCalled();
    });
  });
});
