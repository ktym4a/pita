// oxlint-disable import/max-dependencies
import { describe, expect, it, beforeEach, vi } from "vitest";
import { fakeBrowser } from "wxt/testing/fake-browser";

import {
  getSettings,
  saveSettings,
  isProviderEnabled,
  toggleGlobalEnabled,
  toggleProviderEnabled,
  watchSettings,
} from "@/lib/storage/settings";

// oxlint-disable-next-line max-lines-per-function
describe("settings", () => {
  beforeEach(() => {
    fakeBrowser.reset();
  });

  describe("reading settings", () => {
    it("should return defaults when storage is empty", async () => {
      const settings = await getSettings();

      expect(settings.globalEnabled).toBe(true);
      expect(settings.providers.notion?.enabled).toBe(true);
      expect(settings.providers["google-docs"]?.enabled).toBe(true);
    });

    it("should merge stored settings with defaults for new providers", async () => {
      await fakeBrowser.storage.local.set({
        "pita-settings": {
          globalEnabled: false,
          providers: { notion: { enabled: true } },
        },
      });

      const settings = await getSettings();

      expect(settings.globalEnabled).toBe(false);
      expect(settings.providers.notion?.enabled).toBe(true);
      expect(settings.providers["google-docs"]?.enabled).toBe(true);
    });
  });

  describe("saving settings", () => {
    it("should persist settings to storage", async () => {
      const settings = {
        globalEnabled: false,
        providers: { notion: { enabled: true }, "google-docs": { enabled: false } },
      };

      await saveSettings(settings);

      const stored = await fakeBrowser.storage.local.get("pita-settings");
      expect(stored["pita-settings"]).toEqual(settings);
    });
  });

  describe("provider enabled check", () => {
    it("should return false when global is disabled", async () => {
      await fakeBrowser.storage.local.set({
        "pita-settings": {
          globalEnabled: false,
          providers: { notion: { enabled: true } },
        },
      });

      expect(await isProviderEnabled("notion")).toBe(false);
    });

    it("should return true only when both global and provider are enabled", async () => {
      await fakeBrowser.storage.local.set({
        "pita-settings": {
          globalEnabled: true,
          providers: { notion: { enabled: true } },
        },
      });

      expect(await isProviderEnabled("notion")).toBe(true);
    });

    it("should default to true for unknown providers", async () => {
      await fakeBrowser.storage.local.set({
        "pita-settings": { globalEnabled: true, providers: {} },
      });

      expect(await isProviderEnabled("unknown")).toBe(true);
    });
  });

  describe("toggling", () => {
    it("should toggle global enabled state", async () => {
      await fakeBrowser.storage.local.set({
        "pita-settings": { globalEnabled: true, providers: {} },
      });

      expect(await toggleGlobalEnabled()).toBe(false);
      expect(await toggleGlobalEnabled()).toBe(true);
    });

    it("should toggle provider enabled state", async () => {
      await fakeBrowser.storage.local.set({
        "pita-settings": {
          globalEnabled: true,
          providers: { notion: { enabled: true } },
        },
      });

      expect(await toggleProviderEnabled("notion")).toBe(false);
      expect(await toggleProviderEnabled("notion")).toBe(true);
    });

    it("should create provider entry on first toggle", async () => {
      await fakeBrowser.storage.local.set({
        "pita-settings": { globalEnabled: true, providers: {} },
      });

      // First toggle: default true -> false
      expect(await toggleProviderEnabled("new-provider")).toBe(false);
    });
  });

  describe("watching changes", () => {
    it("should notify callback when settings change", async () => {
      const callback = vi.fn();
      const unwatch = watchSettings(callback);

      await fakeBrowser.storage.local.set({
        "pita-settings": {
          globalEnabled: false,
          providers: { notion: { enabled: true } },
        },
      });

      // fakeBrowser triggers storage.onChanged listeners
      await vi.waitFor(() => {
        expect(callback).toHaveBeenCalled();
      });

      const [newSettings] = callback.mock.calls[0];
      expect(newSettings.globalEnabled).toBe(false);

      unwatch();
    });

    it("should merge defaults in callback values", async () => {
      const callback = vi.fn();
      const unwatch = watchSettings(callback);

      await fakeBrowser.storage.local.set({
        "pita-settings": {
          globalEnabled: true,
          providers: {},
        },
      });

      await vi.waitFor(() => {
        expect(callback).toHaveBeenCalled();
      });

      const [newSettings] = callback.mock.calls[0];
      // Should have defaults merged
      expect(newSettings.providers.notion).toBeDefined();
      expect(newSettings.providers["google-docs"]).toBeDefined();

      unwatch();
    });
  });
});
