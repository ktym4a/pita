/**
 * Google Docs Adapter
 *
 * Handles Google Docs-specific behavior for copy interception.
 *
 * Google Docs Specifics:
 * - Uses aria-level attribute for list nesting (accessibility)
 * - Wraps external links through google.com/url?q=
 * - Uses <b> tags with docs-internal-guid as non-bold wrappers
 * - Renders in iframes that need separate event listeners
 *
 * Iframe Handling:
 * Google Docs uses iframes for the document editing area.
 * We need to attach event listeners to both the main document
 * and any accessible iframes. Iframes are retried after delays
 * because they may load after the content script runs.
 */

import { BaseAdapter } from "@/providers/_shared/base-adapter";
import { STYLE_PATTERNS } from "@/providers/_shared/constants";

import { googleDocsConfig } from "./config";

export class GoogleDocsAdapter extends BaseAdapter {
  /** WeakMap to track which iframe documents have handlers attached */
  private iframeHandlers: WeakMap<Document, (e: KeyboardEvent) => Promise<void>> = new WeakMap();
  /** Timeout IDs for cleanup */
  private attachTimeouts: number[] = [];

  constructor() {
    super(googleDocsConfig);
  }

  /**
   * Get list nesting level from aria-level attribute.
   *
   * Google Docs uses aria-level for accessibility:
   * ```html
   * <li aria-level="1">Level 1</li>
   * <li aria-level="2">Level 2</li>
   * ```
   *
   * @param {Element} node - List item element
   * @returns {number} List level from aria-level or 1
   */
  getListLevel(node: Element): number {
    const ariaLevel = node.getAttribute("aria-level");
    if (ariaLevel) {
      return parseInt(ariaLevel, 10);
    }
    return 1;
  }

  /**
   * Extract actual URL from Google redirect URL.
   *
   * Google Docs wraps external links for tracking:
   * https://www.google.com/url?q=https://example.com&sa=...
   *
   * We extract the 'q' parameter to get the actual destination.
   *
   * @param {string} href - Original href attribute value
   * @returns {string} Extracted URL or original if not a redirect
   */
  extractUrl(href: string): string {
    if (!href.includes("google.com/url")) {
      return href;
    }
    try {
      const url = new URL(href);
      return url.searchParams.get("q") ?? href;
    } catch {
      return href;
    }
  }

  /**
   * Check if element is a Google Docs wrapper (not actual bold).
   *
   * Google Docs uses <b id="docs-internal-guid-xxx"> as container elements.
   * These aren't actually bold - they're structural wrappers.
   * Also check for explicit font-weight: normal which overrides <b>.
   *
   * @param {Element} element - Element to check
   * @param {string} style - Style attribute value
   * @returns {boolean} True if element is a wrapper
   */
  isWrapperElement(element: Element, style: string): boolean {
    return element.id?.startsWith("docs-internal-guid") || STYLE_PATTERNS.boldNormal.test(style);
  }

  /**
   * Set up event listeners including iframe handling.
   *
   * Google Docs renders the document in iframes. We attach to:
   * 1. Main document (base class handles this)
   * 2. All accessible iframes
   *
   * Iframes are retried at 2s and 5s because they may load after
   * the content script runs.
   *
   * @param {Function} handler - Keyboard event handler
   */
  setupEventListeners(handler: (e: KeyboardEvent) => Promise<void>): void {
    super.setupEventListeners(handler);
    this.attachToIframes(handler);

    // Retry iframe attachment after delays (iframes may load late)
    this.attachTimeouts.push(window.setTimeout(() => this.attachToIframes(handler), 2000));
    this.attachTimeouts.push(window.setTimeout(() => this.attachToIframes(handler), 5000));
  }

  /**
   * Attach event listeners to all accessible iframes.
   * Uses WeakMap to avoid attaching multiple listeners to same iframe.
   *
   * @param {Function} handler - Keyboard event handler
   */
  private attachToIframes(handler: (e: KeyboardEvent) => Promise<void>): void {
    const iframes = document.querySelectorAll("iframe");
    iframes.forEach((iframe) => {
      try {
        const iframeDoc = iframe.contentDocument;
        if (iframeDoc && !this.iframeHandlers.has(iframeDoc)) {
          iframeDoc.addEventListener("keydown", handler, true);
          this.iframeHandlers.set(iframeDoc, handler);
        }
      } catch {
        // Cross-origin iframe - can't access, silently skip
      }
    });
  }

  /**
   * Clean up all event listeners including iframes.
   */
  cleanup(): void {
    super.cleanup();

    // Clear retry timeouts
    this.attachTimeouts.forEach((id) => window.clearTimeout(id));
    this.attachTimeouts = [];

    // Remove iframe listeners
    const iframes = document.querySelectorAll("iframe");
    iframes.forEach((iframe) => {
      try {
        const iframeDoc = iframe.contentDocument;
        if (iframeDoc) {
          const handler = this.iframeHandlers.get(iframeDoc);
          if (handler) {
            iframeDoc.removeEventListener("keydown", handler, true);
            this.iframeHandlers.delete(iframeDoc);
          }
        }
      } catch {
        // Cross-origin iframe - can't access, silently skip
      }
    });
  }
}

export const googleDocsAdapter = new GoogleDocsAdapter();
