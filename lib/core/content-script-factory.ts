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

import type { ServiceAdapter } from "@/providers/_shared/types";

import {
  isCopyShortcut,
  waitForClipboard,
  readClipboardHtml,
  writeSlackTexty,
} from "@/lib/core/clipboard";
import { convertToSlackTexty, convertToPlainText } from "@/lib/core/converter";
import { initNotification, showNotification } from "@/lib/ui/notification";

/**
 * Configuration options for content script handler
 */
export interface ContentScriptOptions {
  /** The service adapter for provider-specific behavior */
  readonly adapter: ServiceAdapter;
  /** Message to show in notification after successful copy */
  readonly notificationMessage: string;
  /**
   * Optional filter to determine if HTML should be processed.
   * Use case: Google Docs only processes content containing lists.
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
 * 5. Apply optional HTML filter (e.g., containsLists for Google Docs)
 * 6. Convert HTML to Slack texty format
 * 7. Write converted content back to clipboard
 * 8. Show success notification
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
  const { adapter, notificationMessage, htmlFilter, ctx } = options;

  // Initialize notification UI with Shadow Root
  await initNotification(ctx);

  return async (e: KeyboardEvent): Promise<void> => {
    if (!isCopyShortcut(e)) return;

    // Wait for source application (Notion/Google Docs) to finish copying.
    // Without this delay, we might read stale clipboard content.
    await waitForClipboard();

    const html = await readClipboardHtml();
    if (!html) return;

    // Apply optional HTML filter (e.g., Google Docs only processes lists)
    if (htmlFilter && !htmlFilter(html)) return;

    const slackTexty = convertToSlackTexty(html, adapter);
    // Skip if conversion produced no operations (empty or unsupported content)
    if (slackTexty.ops.length === 0) return;

    // Plain text is used as fallback for apps that don't support slack/texty
    const plainText = convertToPlainText(html);
    writeSlackTexty(plainText, slackTexty);
    showNotification(notificationMessage);
  };
}
