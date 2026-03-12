/**
 * Copy Processing
 *
 * Orchestrates HTML conversion and clipboard writing for both output modes.
 * Extracted from content-script-factory to keep module dependencies focused.
 */

import { writePlainText, writeSlackTexty } from "@/lib/core/clipboard";
import {
  convertToSlackMarkdown,
  convertToPlainText,
  convertToSlackTexty,
} from "@/lib/core/converter";
import type { OutputMode } from "@/lib/storage/settings";
import type { ServiceAdapter } from "@/providers/_shared/types";

/**
 * Convert HTML and write to clipboard based on output mode.
 *
 * @param {string} html - HTML content from clipboard
 * @param {ServiceAdapter} adapter - Provider-specific adapter
 * @param {OutputMode} outputMode - Current output mode
 * @returns {Promise<boolean>} True if content was written, false if skipped
 */
export async function processAndWrite(
  html: string,
  adapter: ServiceAdapter,
  outputMode: OutputMode,
): Promise<boolean> {
  if (outputMode === "markdown") {
    const markdown = convertToSlackMarkdown(html, adapter);
    if (!markdown.trim()) return false;
    await writePlainText(markdown);
    return true;
  }

  const slackTexty = convertToSlackTexty(html, adapter);
  if (slackTexty.ops.length === 0) return false;

  const plainText = convertToPlainText(html);
  writeSlackTexty(plainText, slackTexty);
  return true;
}
