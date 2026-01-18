/**
 * Provider Registry
 *
 * Single source of truth for all provider registrations.
 * This eliminates hardcoded provider IDs scattered across the codebase.
 *
 * Design Decision:
 * - Before: Provider IDs were hardcoded in settings.ts and popup/main.ts
 * - After: All provider info is centralized here
 * - Benefits:
 *   1. Adding a new provider requires only one change (here)
 *   2. No risk of ID mismatches between files
 *   3. Default settings are derived automatically from registry
 *
 * To add a new provider:
 * 1. Create adapter in providers/<name>/
 * 2. Add entry to PROVIDER_REGISTRY below
 * 3. Create content script in entrypoints/
 */

import type { ProviderSettings } from "@/lib/storage/settings";

import type { ServiceAdapter } from "./_shared/types";

import { googleDocsAdapter } from "./google-docs";
import { notionAdapter } from "./notion";

/**
 * Provider registration entry
 */
export interface ProviderRegistration {
  /** The service adapter instance for this provider */
  readonly adapter: ServiceAdapter;
  /** Whether this provider is enabled by default for new users */
  readonly defaultEnabled: boolean;
}

/**
 * Central registry of all providers.
 *
 * The key MUST match the adapter's `id` property.
 * This is enforced by tests in registry.test.ts.
 */
export const PROVIDER_REGISTRY: Readonly<Record<string, ProviderRegistration>> = {
  notion: {
    adapter: notionAdapter,
    defaultEnabled: true,
  },
  "google-docs": {
    adapter: googleDocsAdapter,
    defaultEnabled: true,
  },
};

/**
 * Get all registered provider IDs.
 * Used by popup UI to render provider toggles dynamically.
 *
 * @returns {string[]} Array of provider IDs
 */
export function getProviderIds(): string[] {
  return Object.keys(PROVIDER_REGISTRY);
}

/**
 * Get default provider settings from registry.
 * Used by settings.ts to initialize DEFAULT_SETTINGS.
 * This ensures new providers are automatically included in default settings.
 *
 * @returns {Record<string, ProviderSettings>} Default settings for all providers
 */
export function getDefaultProviderSettings(): Record<string, ProviderSettings> {
  const settings: Record<string, ProviderSettings> = {};

  for (const [id, registration] of Object.entries(PROVIDER_REGISTRY)) {
    settings[id] = { enabled: registration.defaultEnabled };
  }

  return settings;
}
