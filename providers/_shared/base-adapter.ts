/**
 * Base Adapter
 *
 * Abstract base class providing default implementations for ServiceAdapter.
 * Provider-specific adapters extend this class and override methods as needed.
 *
 * Default behavior:
 * - extractUrl: Returns href as-is (no URL unwrapping)
 * - isWrapperElement: Returns false (no wrapper detection)
 * - setupEventListeners: Attaches to document keydown
 * - cleanup: Removes document keydown listener
 *
 * Subclasses MUST implement:
 * - getListLevel: Provider-specific list nesting detection
 */

import type { ProviderConfig, ServiceAdapter } from "./types";

export abstract class BaseAdapter implements ServiceAdapter {
  readonly id: string;
  readonly name: string;
  readonly urlPatterns: ReadonlyArray<RegExp>;
  readonly contentScriptMatches: ReadonlyArray<string>;

  /** Stored handler reference for cleanup */
  private keydownHandler: ((e: KeyboardEvent) => Promise<void>) | null = null;

  constructor(config: ProviderConfig) {
    this.id = config.id;
    this.name = config.name;
    this.urlPatterns = config.urlPatterns;
    this.contentScriptMatches = config.contentScriptMatches;
  }

  /**
   * Get list nesting level - must be implemented by subclass.
   * Each provider has different HTML structure for nested lists.
   */
  abstract getListLevel(node: Element): number;

  /**
   * Extract actual URL from href.
   * Default: return as-is. Override for providers that wrap URLs (e.g., Google Docs).
   *
   * @param {string} href - Original href attribute value
   * @returns {string} Extracted URL
   */
  extractUrl(href: string): string {
    return href;
  }

  /**
   * Check if element is a wrapper (not actual formatting).
   * Default: return false. Override for providers with wrapper elements.
   *
   * @param {Element} _element - Element to check
   * @param {string} _style - Style attribute value
   * @returns {boolean} True if element is a wrapper
   */
  isWrapperElement(_element: Element, _style: string): boolean {
    return false;
  }

  /**
   * Set up event listeners for copy interception.
   *
   * Uses capture phase (true) to intercept before the app's handlers.
   * This ensures we can read the clipboard after the app writes to it.
   *
   * @param {Function} handler - Keyboard event handler
   */
  setupEventListeners(handler: (e: KeyboardEvent) => Promise<void>): void {
    this.keydownHandler = handler;
    document.addEventListener("keydown", this.keydownHandler, true);
  }

  /**
   * Clean up event listeners.
   */
  cleanup(): void {
    if (this.keydownHandler) {
      document.removeEventListener("keydown", this.keydownHandler, true);
      this.keydownHandler = null;
    }
  }
}
