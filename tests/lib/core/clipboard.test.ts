import { describe, expect, it, vi } from "vitest";

import { isCopyShortcut, waitForClipboard } from "@/lib/core/clipboard";

describe("isCopyShortcut - valid shortcuts", () => {
  it("should return true for Cmd+C (Mac)", () => {
    const event = new KeyboardEvent("keydown", {
      key: "c",
      metaKey: true,
      ctrlKey: false,
    });
    expect(isCopyShortcut(event)).toBe(true);
  });

  it("should return true for Ctrl+C (Windows/Linux)", () => {
    const event = new KeyboardEvent("keydown", {
      key: "c",
      metaKey: false,
      ctrlKey: true,
    });
    expect(isCopyShortcut(event)).toBe(true);
  });

  it("should return true for Cmd+Ctrl+C", () => {
    const event = new KeyboardEvent("keydown", {
      key: "c",
      metaKey: true,
      ctrlKey: true,
    });
    expect(isCopyShortcut(event)).toBe(true);
  });
});

describe("isCopyShortcut - invalid shortcuts", () => {
  it("should return false for just C key", () => {
    const event = new KeyboardEvent("keydown", {
      key: "c",
      metaKey: false,
      ctrlKey: false,
    });
    expect(isCopyShortcut(event)).toBe(false);
  });

  it("should return false for Cmd+V (paste)", () => {
    const event = new KeyboardEvent("keydown", {
      key: "v",
      metaKey: true,
      ctrlKey: false,
    });
    expect(isCopyShortcut(event)).toBe(false);
  });

  it("should return false for Cmd+X (cut)", () => {
    const event = new KeyboardEvent("keydown", {
      key: "x",
      metaKey: true,
      ctrlKey: false,
    });
    expect(isCopyShortcut(event)).toBe(false);
  });

  it("should return false for Shift+C", () => {
    const event = new KeyboardEvent("keydown", {
      key: "c",
      shiftKey: true,
      metaKey: false,
      ctrlKey: false,
    });
    expect(isCopyShortcut(event)).toBe(false);
  });

  it("should return false for Alt+C", () => {
    const event = new KeyboardEvent("keydown", {
      key: "c",
      altKey: true,
      metaKey: false,
      ctrlKey: false,
    });
    expect(isCopyShortcut(event)).toBe(false);
  });
});

describe("waitForClipboard", () => {
  it("should resolve after default delay", async () => {
    vi.useFakeTimers();
    const promise = waitForClipboard();

    vi.advanceTimersByTime(299);
    await Promise.resolve();

    vi.advanceTimersByTime(1);
    await expect(promise).resolves.toBeUndefined();

    vi.useRealTimers();
  });

  it("should resolve after custom delay", async () => {
    vi.useFakeTimers();
    const promise = waitForClipboard(500);

    vi.advanceTimersByTime(499);
    await Promise.resolve();

    vi.advanceTimersByTime(1);
    await expect(promise).resolves.toBeUndefined();

    vi.useRealTimers();
  });

  it("should accept 0 delay", async () => {
    vi.useFakeTimers();
    const promise = waitForClipboard(0);

    vi.advanceTimersByTime(0);
    await expect(promise).resolves.toBeUndefined();

    vi.useRealTimers();
  });
});
