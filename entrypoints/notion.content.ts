import { createContentScriptHandler } from "@/lib/core/content-script-factory";
import { isProviderEnabled, watchSettings } from "@/lib/storage/settings";
import { cleanupNotification } from "@/lib/ui/notification";
// oxlint-disable-next-line import/no-unassigned-import -- CSS side-effect import for Shadow DOM styles
import "@/lib/ui/notification.css";
import { notionAdapter } from "@/providers/notion";

export default defineContentScript({
  matches: [...notionAdapter.contentScriptMatches],
  runAt: "document_idle",
  cssInjectionMode: "ui",

  async main(ctx) {
    let enabled = await isProviderEnabled(notionAdapter.id);

    const unwatch = watchSettings(async () => {
      enabled = await isProviderEnabled(notionAdapter.id);
    });

    const handleCopy = await createContentScriptHandler({
      adapter: notionAdapter,
      notificationMessage: browser.i18n.getMessage("notificationFormattedForSlack"),
      ctx,
    });

    notionAdapter.setupEventListeners(async (e: KeyboardEvent) => {
      if (!enabled) return;
      await handleCopy(e);
    });

    // Cleanup when extension is invalidated (updated/disabled/uninstalled)
    ctx.onInvalidated(() => {
      unwatch();
      notionAdapter.cleanup();
      cleanupNotification();
    });
  },
});
