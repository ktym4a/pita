import { applyBadgeState, determineBadgeState, getTabInfo } from "@/lib/background/badge";
import { getSettings, watchSettings } from "@/lib/storage/settings";

export default defineBackground({
  type: "module",
  main() {
    const action = browser.action ?? browser.browserAction;
    const tabs = browser.tabs;

    /**
     * Update badge and icon based on settings and current tab URL.
     *
     * @param {number} [tabId] - Tab ID to update for
     */
    const updateBadge = async (tabId?: number): Promise<void> => {
      const tabInfo = await getTabInfo(tabs, tabId);
      if (!tabInfo || tabInfo.tabId === undefined) return;

      const settings = await getSettings();
      const state = determineBadgeState(settings.globalEnabled, tabInfo.url, settings.providers);
      console.log("[pita] updateBadge", { url: tabInfo.url, state });
      await applyBadgeState(action, tabInfo.tabId, state);
    };

    // Update badge when tab is activated
    browser.tabs.onActivated.addListener((activeInfo) => {
      updateBadge(activeInfo.tabId);
    });

    // Update badge when tab URL changes
    browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
      if (changeInfo.url) {
        updateBadge(tabId);
      }
    });

    // Update all tabs when settings change
    watchSettings(async () => {
      const allTabs = await browser.tabs.query({});
      for (const tab of allTabs) {
        if (tab.id !== undefined) {
          updateBadge(tab.id);
        }
      }
    });

    // Initial badge state for active tab
    updateBadge();
  },
});
