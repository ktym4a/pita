import { createContentScriptHandler } from "@/lib/core/content-script-factory";
import { containsLists } from "@/lib/core/converter";
import { isProviderEnabled, watchSettings } from "@/lib/storage/settings";
import { cleanupNotification } from "@/lib/ui/notification";
// oxlint-disable-next-line import/no-unassigned-import -- CSS side-effect import for Shadow DOM styles
import "@/lib/ui/notification.css";
import { googleDocsAdapter } from "@/providers/google-docs";

export default defineContentScript({
  matches: [...googleDocsAdapter.contentScriptMatches],
  runAt: "document_idle",
  cssInjectionMode: "ui",

  async main(ctx) {
    let enabled = await isProviderEnabled(googleDocsAdapter.id);

    const unwatch = watchSettings(async () => {
      enabled = await isProviderEnabled(googleDocsAdapter.id);
    });

    const handleCopy = await createContentScriptHandler({
      adapter: googleDocsAdapter,
      notificationMessage: browser.i18n.getMessage("notificationFormattedForSlack"),
      htmlFilter: containsLists,
      ctx,
    });

    googleDocsAdapter.setupEventListeners(async (e: KeyboardEvent) => {
      if (!enabled) return;
      await handleCopy(e);
    });

    // Cleanup when extension is invalidated (updated/disabled/uninstalled)
    ctx.onInvalidated(() => {
      unwatch();
      googleDocsAdapter.cleanup();
      cleanupNotification();
    });
  },
});
