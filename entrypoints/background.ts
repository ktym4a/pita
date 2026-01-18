import { applyIconState, isIconDisabled, getTabInfo } from "@/lib/background/icon-state";
import { getSettings, watchSettings } from "@/lib/storage/settings";

export default defineBackground({
  type: "module",
  main() {
    const action = browser.action ?? browser.browserAction;
    const tabs = browser.tabs;

    /**
     * Update icon based on settings and current tab URL.
     *
     * @param {number} [tabId] - Tab ID to update for
     */
    const updateIcon = async (tabId?: number): Promise<void> => {
      const tabInfo = await getTabInfo(tabs, tabId);
      if (!tabInfo || tabInfo.tabId === undefined) return;

      const settings = await getSettings();
      const disabled = isIconDisabled(settings.globalEnabled, tabInfo.url, settings.providers);
      await applyIconState(action, tabInfo.tabId, disabled);
    };

    // Update icon when tab is activated
    browser.tabs.onActivated.addListener((activeInfo) => {
      updateIcon(activeInfo.tabId);
    });

    // Update icon when tab URL changes
    browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
      if (changeInfo.url) {
        updateIcon(tabId);
      }
    });

    // Update all tabs when settings change
    watchSettings(async () => {
      const allTabs = await browser.tabs.query({});
      for (const tab of allTabs) {
        if (tab.id !== undefined) {
          updateIcon(tab.id);
        }
      }
    });

    // Initial icon state for active tab
    updateIcon();
  },
});
