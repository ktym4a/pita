import { describe, expect, it, beforeEach, vi } from "vitest";

import type { PitaSettings } from "@/lib/storage/settings";

import { applyI18n, updateUI, setupToggleHandlers, type I18nApi } from "@/lib/popup/ui";

function createTestDOM(html: string): void {
  // Using innerHTML is safe here - this is a test file with hardcoded test HTML
  document.body.innerHTML = html;
}

function createDefaultSettings(overrides: Partial<PitaSettings> = {}): PitaSettings {
  return {
    globalEnabled: true,
    providers: {
      notion: { enabled: true },
      "google-docs": { enabled: true },
    },
    ...overrides,
  };
}

function createMockI18n(messages: Record<string, string>): I18nApi {
  return {
    getMessage: vi.fn((key: string) => messages[key] ?? ""),
  };
}

const PROVIDER_IDS = ["notion", "google-docs"];

describe("popup/ui", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  describe("applyI18n", () => {
    it("should set text content for elements with data-i18n", () => {
      createTestDOM(`
        <span data-i18n="greeting">default</span>
        <span data-i18n="farewell">default</span>
      `);

      const mockI18n = createMockI18n({
        greeting: "Hello",
        farewell: "Goodbye",
      });

      applyI18n(document, mockI18n);

      const greeting = document.querySelector('[data-i18n="greeting"]');
      const farewell = document.querySelector('[data-i18n="farewell"]');

      expect(greeting?.textContent).toBe("Hello");
      expect(farewell?.textContent).toBe("Goodbye");
    });

    it("should not change text when getMessage returns empty string", () => {
      createTestDOM(`<span data-i18n="unknown">default</span>`);

      const mockI18n: I18nApi = {
        getMessage: vi.fn().mockReturnValue(""),
      };

      applyI18n(document, mockI18n);

      const element = document.querySelector('[data-i18n="unknown"]');
      expect(element?.textContent).toBe("default");
    });

    it("should handle elements without data-i18n key", () => {
      createTestDOM(`<span data-i18n="">default</span>`);

      const mockI18n: I18nApi = {
        getMessage: vi.fn(),
      };

      applyI18n(document, mockI18n);

      expect(mockI18n.getMessage).not.toHaveBeenCalled();
    });
  });

  // oxlint-disable-next-line max-lines-per-function
  describe("updateUI", () => {
    const globalToggleHtml = `<button id="global-toggle" aria-checked="false"></button>`;

    const providerHtml = `
      <div id="provider-notion">
        <span class="provider-label"></span>
        <button data-provider="notion" aria-checked="false"></button>
      </div>
      <div id="provider-google-docs">
        <span class="provider-label"></span>
        <button data-provider="google-docs" aria-checked="false"></button>
      </div>
    `;

    it("should update global toggle state when enabled", () => {
      createTestDOM(globalToggleHtml);
      const settings = createDefaultSettings({ globalEnabled: true });

      updateUI(document, settings, PROVIDER_IDS);

      const toggle = document.getElementById("global-toggle");
      expect(toggle?.getAttribute("aria-checked")).toBe("true");
      expect(toggle?.classList.contains("enabled")).toBe(true);
    });

    it("should update global toggle state when disabled", () => {
      createTestDOM(globalToggleHtml);
      const settings = createDefaultSettings({ globalEnabled: false });

      updateUI(document, settings, PROVIDER_IDS);

      const toggle = document.getElementById("global-toggle");
      expect(toggle?.getAttribute("aria-checked")).toBe("false");
      expect(toggle?.classList.contains("enabled")).toBe(false);
    });

    it("should update provider toggle state when enabled", () => {
      createTestDOM(providerHtml);
      const settings = createDefaultSettings();

      updateUI(document, settings, PROVIDER_IDS);

      const notionToggle = document.querySelector('[data-provider="notion"]');
      expect(notionToggle?.getAttribute("aria-checked")).toBe("true");
      expect(notionToggle?.classList.contains("enabled")).toBe(true);
    });

    it("should update provider toggle state when disabled", () => {
      createTestDOM(providerHtml);
      const settings = createDefaultSettings({
        providers: {
          notion: { enabled: false },
          "google-docs": { enabled: true },
        },
      });

      updateUI(document, settings, PROVIDER_IDS);

      const notionToggle = document.querySelector('[data-provider="notion"]');
      expect(notionToggle?.getAttribute("aria-checked")).toBe("false");
      expect(notionToggle?.classList.contains("enabled")).toBe(false);
    });

    it("should disable provider toggles when global is disabled", () => {
      createTestDOM(providerHtml);
      const settings = createDefaultSettings({ globalEnabled: false });

      updateUI(document, settings, PROVIDER_IDS);

      const notionToggle = document.querySelector('[data-provider="notion"]') as HTMLButtonElement;
      expect(notionToggle?.disabled).toBe(true);
      expect(notionToggle?.classList.contains("disabled")).toBe(true);
    });

    it("should enable provider toggles when global is enabled", () => {
      createTestDOM(providerHtml);
      const settings = createDefaultSettings({ globalEnabled: true });

      updateUI(document, settings, PROVIDER_IDS);

      const notionToggle = document.querySelector('[data-provider="notion"]') as HTMLButtonElement;
      expect(notionToggle?.disabled).toBe(false);
      expect(notionToggle?.classList.contains("disabled")).toBe(false);
    });

    it("should update row disabled state based on global state", () => {
      createTestDOM(providerHtml);

      const enabledSettings = createDefaultSettings({ globalEnabled: true });
      updateUI(document, enabledSettings, PROVIDER_IDS);

      let row = document.getElementById("provider-notion");
      expect(row?.classList.contains("disabled")).toBe(false);

      const disabledSettings = createDefaultSettings({ globalEnabled: false });
      updateUI(document, disabledSettings, PROVIDER_IDS);

      row = document.getElementById("provider-notion");
      expect(row?.classList.contains("disabled")).toBe(true);
    });

    it("should default to enabled for unknown providers", () => {
      createTestDOM(providerHtml);
      // Empty providers object to test default behavior
      const settings = createDefaultSettings({
        globalEnabled: true,
        providers: {},
      });

      updateUI(document, settings, PROVIDER_IDS);

      const notionToggle = document.querySelector('[data-provider="notion"]');
      expect(notionToggle?.getAttribute("aria-checked")).toBe("true");
    });

    it("should handle missing DOM elements gracefully", () => {
      // Empty DOM to test graceful handling
      createTestDOM("");
      const settings = createDefaultSettings();

      expect(() => updateUI(document, settings, PROVIDER_IDS)).not.toThrow();
    });
  });

  describe("setupToggleHandlers", () => {
    it("should call onGlobalToggle when global toggle is clicked", () => {
      createTestDOM(`<button id="global-toggle"></button>`);
      const onGlobalToggle = vi.fn();
      const onProviderToggle = vi.fn();

      setupToggleHandlers(document, PROVIDER_IDS, onGlobalToggle, onProviderToggle);

      const toggle = document.getElementById("global-toggle");
      toggle?.click();

      expect(onGlobalToggle).toHaveBeenCalledTimes(1);
      expect(onProviderToggle).not.toHaveBeenCalled();
    });

    it("should call onProviderToggle with provider ID when provider toggle is clicked", () => {
      createTestDOM(`
        <button data-provider="notion"></button>
        <button data-provider="google-docs"></button>
      `);
      const onGlobalToggle = vi.fn();
      const onProviderToggle = vi.fn();

      setupToggleHandlers(document, PROVIDER_IDS, onGlobalToggle, onProviderToggle);

      const notionToggle = document.querySelector('[data-provider="notion"]') as HTMLElement;
      notionToggle?.click();

      expect(onProviderToggle).toHaveBeenCalledTimes(1);
      expect(onProviderToggle).toHaveBeenCalledWith("notion");
    });

    it("should handle missing elements gracefully", () => {
      // Empty DOM to test graceful handling
      createTestDOM("");
      const onGlobalToggle = vi.fn();
      const onProviderToggle = vi.fn();

      expect(() =>
        setupToggleHandlers(document, PROVIDER_IDS, onGlobalToggle, onProviderToggle),
      ).not.toThrow();
    });
  });
});
