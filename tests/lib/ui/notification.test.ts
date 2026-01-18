import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

// Simple mock - minimal API that simulates WXT shadow root behavior
vi.mock("wxt/utils/content-script-ui/shadow-root", () => ({
  createShadowRootUi: vi.fn((_ctx, options) => {
    let container: HTMLDivElement | null = null;
    return Promise.resolve({
      mount: () => {
        container = document.createElement("div");
        document.body.appendChild(container);
        options.onMount?.(container);
      },
      remove: () => {
        options.onRemove?.();
        container?.remove();
        container = null;
      },
    });
  }),
}));

import { initNotification, showNotification, cleanupNotification } from "@/lib/ui/notification";

const DURATION = 2000;
const ANIMATION_DURATION = 300;

function createMockContext() {
  return { isInvalid: false, onInvalidated: vi.fn() } as never;
}

function getNotificationElement(): HTMLDivElement | null {
  return document.querySelector(".notification");
}

function clearDOM(): void {
  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
}

// oxlint-disable-next-line max-lines-per-function
describe("notification", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearDOM();
  });

  afterEach(() => {
    cleanupNotification();
    vi.useRealTimers();
  });

  describe("showNotification", () => {
    it("should display message and auto-hide after duration", async () => {
      await initNotification(createMockContext());

      showNotification("Test message");
      const notification = getNotificationElement();

      expect(notification?.style.display).toBe("block");
      expect(notification?.textContent).toBe("Test message");

      vi.advanceTimersByTime(DURATION);
      expect(notification?.classList.contains("slide-out")).toBe(true);

      vi.advanceTimersByTime(ANIMATION_DURATION);
      expect(notification?.style.display).toBe("none");
    });

    it("should reset timer when called again", async () => {
      await initNotification(createMockContext());

      showNotification("First");
      vi.advanceTimersByTime(DURATION - 100);

      showNotification("Second");
      expect(getNotificationElement()?.textContent).toBe("Second");

      vi.advanceTimersByTime(200);
      expect(getNotificationElement()?.style.display).toBe("block");
      expect(getNotificationElement()?.classList.contains("slide-out")).toBe(false);
    });

    it("should do nothing before init", () => {
      expect(() => showNotification("Test")).not.toThrow();
    });
  });

  describe("cleanupNotification", () => {
    it("should remove notification and clear timers", async () => {
      await initNotification(createMockContext());
      showNotification("Test");

      cleanupNotification();
      vi.advanceTimersByTime(DURATION + ANIMATION_DURATION + 100);

      expect(getNotificationElement()).toBeNull();
    });

    it("should allow re-initialization", async () => {
      await initNotification(createMockContext());
      cleanupNotification();

      await initNotification(createMockContext());
      showNotification("After cleanup");

      expect(getNotificationElement()?.textContent).toBe("After cleanup");
    });
  });
});
