import { describe, expect, it } from "vitest";

import {
  PROVIDER_REGISTRY,
  getProviderIds,
  getDefaultProviderSettings,
} from "@/providers/registry";

describe("PROVIDER_REGISTRY", () => {
  it("should contain notion and google-docs providers", () => {
    expect(PROVIDER_REGISTRY).toHaveProperty("notion");
    expect(PROVIDER_REGISTRY).toHaveProperty("google-docs");
  });

  it("should have valid adapter for each provider", () => {
    for (const [id, registration] of Object.entries(PROVIDER_REGISTRY)) {
      expect(registration.adapter).toBeDefined();
      expect(registration.adapter.id).toBe(id);
      expect(typeof registration.adapter.getListLevel).toBe("function");
      expect(typeof registration.adapter.setupEventListeners).toBe("function");
    }
  });

  it("should have defaultEnabled property for each provider", () => {
    for (const registration of Object.values(PROVIDER_REGISTRY)) {
      expect(typeof registration.defaultEnabled).toBe("boolean");
    }
  });
});

describe("getProviderIds", () => {
  it("should return array of provider IDs", () => {
    const ids = getProviderIds();

    expect(Array.isArray(ids)).toBe(true);
    expect(ids).toContain("notion");
    expect(ids).toContain("google-docs");
  });

  it("should return consistent order", () => {
    const ids1 = getProviderIds();
    const ids2 = getProviderIds();

    expect(ids1).toEqual(ids2);
  });
});

describe("getDefaultProviderSettings", () => {
  it("should return settings for all providers", () => {
    const settings = getDefaultProviderSettings();
    const providerIds = getProviderIds();

    for (const id of providerIds) {
      expect(settings).toHaveProperty(id);
      expect(settings[id]).toHaveProperty("enabled");
    }
  });

  it("should set enabled based on defaultEnabled in registry", () => {
    const settings = getDefaultProviderSettings();

    for (const [id, registration] of Object.entries(PROVIDER_REGISTRY)) {
      expect(settings[id]?.enabled).toBe(registration.defaultEnabled);
    }
  });

  it("should have notion enabled by default", () => {
    const settings = getDefaultProviderSettings();
    expect(settings["notion"]?.enabled).toBe(false);
  });

  it("should have google-docs enabled by default", () => {
    const settings = getDefaultProviderSettings();
    expect(settings["google-docs"]?.enabled).toBe(false);
  });
});
