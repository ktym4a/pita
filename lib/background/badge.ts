import { PROVIDER_REGISTRY } from "@/providers/registry";

import { ICON_PATHS_FOR_API, getAllGrayscaleIcons } from "./icon";

/**
 * Badge and icon state configuration.
 */
export interface BadgeState {
  text: string;
  color: string;
  useGrayIcon: boolean;
}

/**
 * Tab information for badge updates.
 */
export interface TabInfo {
  url?: string;
  tabId?: number;
}

/**
 * Browser tabs API interface for dependency injection.
 */
export interface TabsApi {
  query: (queryInfo: {
    active?: boolean;
    currentWindow?: boolean;
  }) => Promise<Array<{ id?: number; url?: string }>>;
  get: (tabId: number) => Promise<{ id?: number; url?: string }>;
}

/**
 * Browser action API interface for dependency injection.
 */
export interface ActionApi {
  setBadgeText: (details: { text: string; tabId: number }) => Promise<void>;
  setBadgeBackgroundColor: (details: { color: string; tabId: number }) => Promise<void>;
  setIcon: (details: {
    path?: Record<number, string>;
    imageData?: Record<number, ImageData>;
    tabId: number;
  }) => Promise<void>;
}

/**
 * Get the provider ID that matches the given URL.
 *
 * @param {string | undefined} url - URL to check
 * @returns {string | null} Provider ID or null if not matched
 */
export function getMatchingProviderId(url: string | undefined): string | null {
  if (!url) return null;

  for (const [providerId, registration] of Object.entries(PROVIDER_REGISTRY)) {
    for (const pattern of registration.adapter.urlPatterns) {
      if (pattern.test(url)) {
        return providerId;
      }
    }
  }
  return null;
}

/**
 * Get current tab info (URL and ID).
 *
 * @param {TabsApi} tabs - Browser tabs API
 * @param {number} [tabId] - Optional tab ID to get info for
 * @returns {Promise<TabInfo | null>} Tab info or null if unavailable
 */
export async function getTabInfo(tabs: TabsApi, tabId?: number): Promise<TabInfo | null> {
  if (tabId === undefined) {
    const [activeTab] = await tabs.query({ active: true, currentWindow: true });
    return { url: activeTab?.url, tabId: activeTab?.id };
  }

  try {
    const tab = await tabs.get(tabId);
    return { url: tab.url, tabId };
  } catch {
    // Tab may have been closed
    return null;
  }
}

/**
 * Determine badge and icon state based on settings and URL.
 *
 * @param {boolean} globalEnabled - Whether extension is globally enabled
 * @param {string | undefined} url - Tab URL
 * @param {Record<string, { enabled: boolean }>} providerSettings - Provider settings
 * @returns {BadgeState} Badge and icon state
 */
export function determineBadgeState(
  globalEnabled: boolean,
  url: string | undefined,
  providerSettings: Record<string, { enabled: boolean }>,
): BadgeState {
  // Global disabled
  if (!globalEnabled) {
    return { text: "-", color: "#6B7280", useGrayIcon: true };
  }

  const providerId = getMatchingProviderId(url);

  // URL not supported
  if (!providerId) {
    return { text: "–", color: "#6B7280", useGrayIcon: true };
  }

  // Provider disabled
  if (!providerSettings[providerId]?.enabled) {
    return { text: "-", color: "#6B7280", useGrayIcon: true };
  }

  // Enabled and supported
  return { text: "", color: "", useGrayIcon: false };
}

/**
 * Apply badge and icon state to a tab.
 *
 * @param {ActionApi} action - Browser action API
 * @param {number} tabId - Tab ID
 * @param {BadgeState} state - Badge and icon state
 */
export async function applyBadgeState(
  action: ActionApi,
  tabId: number,
  state: BadgeState,
): Promise<void> {
  await action.setBadgeText({ text: state.text, tabId });

  if (state.color) {
    await action.setBadgeBackgroundColor({ color: state.color, tabId });
  }

  if (state.useGrayIcon) {
    const grayscaleIcons = await getAllGrayscaleIcons();
    await action.setIcon({ imageData: grayscaleIcons, tabId });
  } else {
    await action.setIcon({ path: ICON_PATHS_FOR_API as Record<number, string>, tabId });
  }
}
