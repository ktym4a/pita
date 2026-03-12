/**
 * Settings Storage
 *
 * Manages extension settings using WXT's storage API with defineItem.
 * Settings are stored in browser's local storage and persist across sessions.
 *
 * Architecture:
 * - Default settings are derived from PROVIDER_REGISTRY (single source of truth)
 * - Settings are merged with defaults on read (handles new providers gracefully)
 * - Real-time updates via watchSettings for instant UI/behavior sync
 */

import { storage } from "#imports";

import { getDefaultProviderSettings } from "@/providers/registry";

/**
 * Output mode for clipboard content.
 * - "texty": Slack's internal rich text format (for rich editor)
 * - "markdown": Slack-compatible markdown (for plain text editor)
 */
export type OutputMode = "texty" | "markdown";

/**
 * Provider-specific settings
 */
export interface ProviderSettings {
  enabled: boolean;
}

/**
 * Application settings schema
 */
export interface PitaSettings {
  /** Master switch - if false, all providers are disabled */
  globalEnabled: boolean;
  /** Output format mode */
  outputMode: OutputMode;
  /** Per-provider settings, keyed by provider ID */
  providers: Record<string, ProviderSettings>;
}

/**
 * Default settings - derived from provider registry.
 * This ensures new providers are automatically enabled by default.
 */
const DEFAULT_SETTINGS: PitaSettings = {
  globalEnabled: true,
  outputMode: "texty",
  providers: getDefaultProviderSettings(),
};

/**
 * WXT storage item for settings.
 * Uses defineItem for type-safe storage operations with automatic fallback.
 */
export const pitaSettings = storage.defineItem<PitaSettings>("local:pita-settings", {
  fallback: DEFAULT_SETTINGS,
});

/**
 * Merge stored settings with defaults.
 * Ensures new providers added in updates get their default settings.
 *
 * @param {PitaSettings} stored - Settings from storage
 * @returns {PitaSettings} Merged settings
 */
function mergeWithDefaults(stored: PitaSettings): PitaSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    providers: {
      ...DEFAULT_SETTINGS.providers,
      ...stored.providers,
    },
  };
}

/**
 * Get current settings.
 *
 * Merges stored settings with defaults to handle:
 * - First-time users (no stored settings)
 * - New providers added in updates (not in stored settings)
 *
 * @returns {Promise<PitaSettings>} Current settings merged with defaults
 */
export async function getSettings(): Promise<PitaSettings> {
  const stored = await pitaSettings.getValue();
  return mergeWithDefaults(stored);
}

/**
 * Save settings to storage.
 *
 * @param {PitaSettings} settings - Settings to save
 */
export async function saveSettings(settings: PitaSettings): Promise<void> {
  await pitaSettings.setValue(settings);
}

/**
 * Check if a provider is enabled.
 *
 * A provider is enabled only if:
 * 1. Global switch is ON
 * 2. Provider-specific switch is ON (or not set, defaults to true)
 *
 * @param {string} providerId - Provider ID to check
 * @returns {Promise<boolean>} True if provider is enabled
 */
export async function isProviderEnabled(providerId: string): Promise<boolean> {
  const settings = await getSettings();
  if (!settings.globalEnabled) {
    return false;
  }
  // Default to true for unknown providers (forward compatibility)
  return settings.providers[providerId]?.enabled ?? true;
}

/**
 * Toggle global enabled state.
 *
 * @returns {Promise<boolean>} New state after toggle
 */
export async function toggleGlobalEnabled(): Promise<boolean> {
  const settings = await getSettings();
  settings.globalEnabled = !settings.globalEnabled;
  await saveSettings(settings);
  return settings.globalEnabled;
}

/**
 * Get current output mode.
 *
 * @returns {Promise<OutputMode>} Current output mode
 */
export async function getOutputMode(): Promise<OutputMode> {
  const settings = await getSettings();
  return settings.outputMode;
}

/**
 * Toggle output mode between "texty" and "markdown".
 *
 * @returns {Promise<OutputMode>} New mode after toggle
 */
export async function toggleOutputMode(): Promise<OutputMode> {
  const settings = await getSettings();
  settings.outputMode = settings.outputMode === "texty" ? "markdown" : "texty";
  await saveSettings(settings);
  return settings.outputMode;
}

/**
 * Toggle provider enabled state.
 * Creates provider entry if it doesn't exist.
 *
 * @param {string} providerId - Provider ID to toggle
 * @returns {Promise<boolean>} New state after toggle
 */
export async function toggleProviderEnabled(providerId: string): Promise<boolean> {
  const settings = await getSettings();
  if (!settings.providers[providerId]) {
    // First toggle for this provider - start with enabled=true, toggle to false
    settings.providers[providerId] = { enabled: true };
  }
  settings.providers[providerId].enabled = !settings.providers[providerId].enabled;
  await saveSettings(settings);
  return settings.providers[providerId].enabled;
}

/**
 * Watch for settings changes.
 *
 * Used by content scripts to react to settings changes in real-time.
 * For example, when user toggles a provider off in popup, content script
 * immediately stops processing copies without page reload.
 *
 * @param {Function} callback - Callback invoked on settings change
 * @returns {Function} Unsubscribe function
 */
export function watchSettings(
  callback: (newSettings: PitaSettings, oldSettings: PitaSettings) => void,
): () => void {
  return pitaSettings.watch((newValue, oldValue) => {
    callback(mergeWithDefaults(newValue), mergeWithDefaults(oldValue));
  });
}
