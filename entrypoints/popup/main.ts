import { applyI18n, setupToggleHandlers, updateUI, type I18nApi } from "@/lib/popup/ui";
import {
  getSettings,
  toggleGlobalEnabled,
  toggleProviderEnabled,
  watchSettings,
} from "@/lib/storage/settings";
import { getProviderIds } from "@/providers/registry";

const PROVIDERS = getProviderIds();

function init(): void {
  applyI18n(document, browser.i18n as I18nApi);

  setupToggleHandlers(
    document,
    PROVIDERS,
    () => toggleGlobalEnabled(),
    (providerId) => toggleProviderEnabled(providerId),
  );

  void getSettings().then((settings) => {
    updateUI(document, settings, PROVIDERS);
    return undefined;
  });

  watchSettings((newSettings) => {
    updateUI(document, newSettings, PROVIDERS);
  });
}

init();
