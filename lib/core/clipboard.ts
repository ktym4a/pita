/**
 * Clipboard Utilities
 *
 * Functions for reading from and writing to the clipboard.
 *
 * Key Concept - Slack Texty Format:
 * Slack uses a custom clipboard format called "slack/texty" for rich text.
 * When you paste into Slack, it checks for this MIME type first.
 * If present, Slack uses it for formatting instead of parsing text/html.
 *
 * Why not just modify text/html?
 * - Slack's HTML parser doesn't handle all formatting correctly
 * - Lists from Notion/Google Docs often lose their nesting
 * - Using slack/texty gives us precise control over formatting
 */

import type { SlackTexty } from "@/providers/_shared/types";

/**
 * Read HTML content from clipboard.
 *
 * Uses the Clipboard API to read clipboard items.
 * Returns null if:
 * - Clipboard access is denied
 * - No HTML content in clipboard
 * - Any error occurs (silently handled)
 *
 * @returns {Promise<string | null>} HTML content or null
 */
export async function readClipboardHtml(): Promise<string | null> {
  try {
    const clipboardItems = await navigator.clipboard.read();
    const htmlItem = clipboardItems.find((item) => item.types.includes("text/html"));

    if (htmlItem) {
      const blob = await htmlItem.getType("text/html");
      return blob.text();
    }
  } catch {
    // Clipboard read failed - common reasons:
    // - User denied permission
    // - Document not focused
    // - Cross-origin restrictions
  }
  return null;
}

/**
 * Write Slack texty format to clipboard.
 *
 * Uses document.execCommand('copy') because the Clipboard API
 * doesn't support custom MIME types like "slack/texty".
 *
 * Flow:
 * 1. Set up a one-time 'copy' event listener
 * 2. Trigger copy with execCommand
 * 3. In the handler, set both text/plain and slack/texty data
 *
 * @param {string} plainText - Fallback text for non-Slack apps
 * @param {SlackTexty} slackTexty - Rich text format for Slack
 */
export function writeSlackTexty(plainText: string, slackTexty: SlackTexty): void {
  const textyJson = JSON.stringify(slackTexty);

  const handler = (e: ClipboardEvent): void => {
    e.preventDefault();
    // Set both formats - apps will use whichever they support
    e.clipboardData?.setData("text/plain", plainText);
    e.clipboardData?.setData("slack/texty", textyJson);
  };

  // { once: true } ensures handler is removed after one use
  document.addEventListener("copy", handler, { once: true });
  document.execCommand("copy");
}

/**
 * Check if copy keyboard shortcut was pressed.
 *
 * Handles both:
 * - Cmd+C (macOS)
 * - Ctrl+C (Windows/Linux)
 *
 * @param {KeyboardEvent} e - Keyboard event
 * @returns {boolean} True if copy shortcut was pressed
 */
export function isCopyShortcut(e: KeyboardEvent): boolean {
  return (e.metaKey || e.ctrlKey) && e.key === "c";
}

/**
 * Wait for clipboard to be updated by the source application.
 *
 * When user presses Cmd+C in Notion/Google Docs, there's a small delay
 * before the app finishes copying to clipboard. Without this wait,
 * we might read stale clipboard content from a previous copy.
 *
 * 300ms is a conservative default that works reliably across apps.
 *
 * @param {number} ms - Milliseconds to wait (default: 300)
 * @returns {Promise<void>} Promise that resolves after delay
 */
export function waitForClipboard(ms = 300): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
