import { PROVIDER_REGISTRY } from "@/providers/registry";

import { ICON_PATHS, getAllDisabledIcons } from "./icon";

/**
 * Tab information for icon updates.
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
 * Determine if the icon should show disabled state.
 *
 * @param {boolean} globalEnabled - Whether extension is globally enabled
 * @param {string | undefined} url - Tab URL
 * @param {Record<string, { enabled: boolean }>} providerSettings - Provider settings
 * @returns {boolean} True if icon should show disabled state
 */
export function isIconDisabled(
  globalEnabled: boolean,
  url: string | undefined,
  providerSettings: Record<string, { enabled: boolean }>,
): boolean {
  if (!globalEnabled) return true;

  const providerId = getMatchingProviderId(url);
  if (!providerId) return true;

  return !providerSettings[providerId]?.enabled;
}

/**
 * Apply icon state to a tab.
 *
 * @param {ActionApi} action - Browser action API
 * @param {number} tabId - Tab ID
 * @param {boolean} disabled - Whether to show disabled icon
 */
export async function applyIconState(
  action: ActionApi,
  tabId: number,
  disabled: boolean,
): Promise<void> {
  if (disabled) {
    const disabledIcons = await getAllDisabledIcons();
    await action.setIcon({ imageData: disabledIcons, tabId });
  } else {
    await action.setIcon({ path: ICON_PATHS as Record<number, string>, tabId });
  }
}
