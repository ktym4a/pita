/**
 * Content Script Factory
 *
 * This module provides a factory function to create content script handlers.
 * It eliminates code duplication between provider-specific content scripts
 * (notion.content.ts, google-docs.content.ts) by extracting common logic.
 *
 * Design Decision:
 * - Each provider has unique requirements (e.g., Google Docs only processes lists)
 * - The factory accepts an optional `htmlFilter` to handle these differences
 * - Provider-specific logic (enabled state, event setup) remains in content scripts
 * - Common clipboard/conversion flow is centralized here
 */

import type { ContentScriptContext } from "wxt/utils/content-script-context";

import { isCopyShortcut, waitForClipboard, readClipboardHtml } from "@/lib/core/clipboard";
import { processAndWrite } from "@/lib/core/process-copy";
import { type OutputMode, getOutputMode } from "@/lib/storage/settings";
import { initNotification, showNotification } from "@/lib/ui/notification";
import type { ServiceAdapter } from "@/providers/_shared/types";

/**
 * Configuration options for content script handler
 */
export interface ContentScriptOptions {
  /** The service adapter for provider-specific behavior */
  readonly adapter: ServiceAdapter;
  /** Notification messages keyed by output mode */
  readonly notificationMessages: Record<OutputMode, string>;
  /**
   * Optional filter to determine if HTML should be processed (texty mode only).
   * Use case: Google Docs only processes content containing lists in texty mode.
   * In markdown mode, all HTML is processed regardless of this filter.
   * If not provided, all HTML content is processed.
   */
  readonly htmlFilter?: (html: string) => boolean;
  /** WXT content script context for Shadow Root UI */
  readonly ctx: ContentScriptContext;
}

/**
 * Create a keyboard event handler for copy interception.
 *
 * Flow:
 * 1. Initialize notification UI with Shadow Root
 * 2. Check if copy shortcut (Cmd/Ctrl+C) was pressed
 * 3. Wait for source app to update clipboard
 * 4. Read HTML from clipboard
 * 5. Apply optional HTML filter in texty mode (e.g., containsLists for Google Docs)
 * 6. Convert HTML to appropriate format and write to clipboard
 * 7. Show success notification
 *
 * Note: The enabled state check is intentionally NOT included here.
 * Each content script handles its own enabled state to allow for
 * real-time updates via watchSettings without recreating the handler.
 *
 * @param {ContentScriptOptions} options - Configuration options
 * @returns {Promise<Function>} Keyboard event handler function
 */
export async function createContentScriptHandler(
  options: ContentScriptOptions,
): Promise<(e: KeyboardEvent) => Promise<void>> {
  const { adapter, notificationMessages, htmlFilter, ctx } = options;

  // Initialize notification UI with Shadow Root
  await initNotification(ctx);

  return async (e: KeyboardEvent): Promise<void> => {
    if (!isCopyShortcut(e)) return;

    // Wait for source application (Notion/Google Docs) to finish copying.
    // Without this delay, we might read stale clipboard content.
    await waitForClipboard();

    const html = await readClipboardHtml();
    if (!html) return;

    // Read output mode first — needed to decide whether to apply HTML filter
    const outputMode = await getOutputMode();

    // Apply optional HTML filter in texty mode only.
    // In texty mode, Slack natively handles most HTML formatting, so we only
    // intercept lists (which break on paste). In markdown mode, ALL formatting
    // must be converted to Slack markdown, so the filter is skipped.
    if (outputMode !== "markdown" && htmlFilter && !htmlFilter(html)) return;
    const written = await processAndWrite(html, adapter, outputMode);

    if (written) {
      showNotification(notificationMessages[outputMode]);
    }
  };
}
