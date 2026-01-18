/**
 * Code Block Handler
 *
 * Converts HTML <pre> elements (code blocks) to Slack's code-block format.
 *
 * Slack Code Block Format:
 * - code-block attribute goes on the NEWLINE character
 * - Each line needs its own newline with code-block: true
 * - Text content is plain (no inline formatting preserved)
 * - Example: { insert: "const x = 1;" }, { insert: "\n", attributes: { "code-block": true } }
 *
 * HTML Structure:
 * - Usually <pre><code>content</code></pre>
 * - Sometimes just <pre>content</pre>
 */

import type { SlackTextOp } from "@/providers/_shared/types";

import type { BlockHandler, HandlerContext } from "../types";

export const codeBlockHandler: BlockHandler = {
  name: "code-block",

  canHandle(element: Element): boolean {
    return element.tagName.toLowerCase() === "pre";
  },

  handle(element: Element, context: HandlerContext): SlackTextOp[] {
    const ops: SlackTextOp[] = [];

    // Try to get content from nested <code> element first, fall back to <pre>
    const codeElement = element.querySelector("code");
    const rawText = codeElement?.textContent ?? element.textContent ?? "";

    // Trim trailing whitespace/newlines but preserve internal structure
    // This prevents extra blank lines at the end of code blocks
    const text = rawText.replace(/\s+$/, "");

    if (text) {
      // Split into lines and create an op for each
      const lines = text.split("\n");
      for (const line of lines) {
        // Add line content (can be empty for blank lines)
        if (line) {
          ops.push({ insert: line });
        }
        // Every line ends with code-block newline
        ops.push({ attributes: { "code-block": true }, insert: "\n" });
      }
    }

    // Skip descendants - we've processed the entire code block
    context.skipDescendants(element);
    return ops;
  },
};
