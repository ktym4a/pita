/**
 * Shared Types
 *
 * Type definitions used across all providers and the converter.
 *
 * @see {@link https://quilljs.com/docs/delta/} Quill Delta format
 * @see {@link https://docs.slack.dev/block-kit/formatting-with-rich-text/} Slack Block Kit rich text
 */

/**
 * Slack texty operation attributes.
 *
 * These map to Slack's internal rich text format.
 * Block-level attributes (list, blockquote, code-block) go on newline characters.
 * Inline attributes (bold, italic, etc.) go on text characters.
 */
export interface SlackTextAttributes {
  // Inline formatting
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  code?: boolean;
  link?: string;
  // Block-level formatting (applied to newline character)
  list?: "bullet" | "ordered";
  /**
   * 0-based indentation level for nested lists
   */
  indent?: number;
  blockquote?: boolean;
  "code-block"?: boolean;
}

/**
 * Single operation in Slack texty format (Delta-like).
 *
 * Similar to Quill Delta format that Slack uses internally.
 * Each op represents a piece of text with optional formatting.
 */
export interface SlackTextOp {
  /** The text content */
  insert: string;
  /** Optional formatting attributes */
  attributes?: SlackTextAttributes;
}

/**
 * Slack texty document format.
 *
 * This is the JSON structure that gets written to clipboard
 * with MIME type "slack/texty".
 */
export interface SlackTexty {
  ops: SlackTextOp[];
}

/**
 * Provider configuration.
 *
 * Static configuration for a provider, used primarily for
 * extension manifest generation.
 */
export interface ProviderConfig {
  /** Unique identifier (e.g., 'notion', 'google-docs') */
  readonly id: string;
  /** Human-readable name */
  readonly name: string;
  /** URL patterns for matching (used in content script matches) */
  readonly urlPatterns: RegExp[];
  /** Content script match patterns for manifest.json */
  readonly contentScriptMatches: string[];
  /** Host permissions for manifest.json */
  readonly hostPermissions: string[];
}

/**
 * Service adapter interface for provider implementations.
 *
 * Each provider (Notion, Google Docs, etc.) implements this interface
 * to handle provider-specific behavior like:
 * - List nesting level detection
 * - URL extraction from wrapped links
 * - Event listener setup
 */
export interface ServiceAdapter {
  readonly id: string;
  readonly name: string;
  readonly urlPatterns: ReadonlyArray<RegExp>;
  readonly contentScriptMatches: ReadonlyArray<string>;

  /**
   * Get list nesting level from element.
   *
   * Different providers encode nesting differently:
   * - Notion: Nested <ul>/<ol> elements
   * - Google Docs: aria-level attribute
   *
   * @param node - List item element
   * @returns Nesting level (1-based, 1 = top level)
   */
  getListLevel(node: Element): number;

  /**
   * Extract actual URL from potentially wrapped/redirect URL.
   *
   * Google Docs wraps external links through google.com/url?q=
   * This method extracts the actual destination URL.
   *
   * @param href - Original href attribute value
   * @returns Extracted URL
   */
  extractUrl(href: string): string;

  /**
   * Check if element is a wrapper element (not actual formatting).
   *
   * Google Docs uses <b> tags with docs-internal-guid as containers,
   * not for actual bold formatting. This method detects those.
   *
   * @param element - Element to check
   * @param style - Style attribute value
   * @returns True if element is a wrapper (should not be treated as bold)
   */
  isWrapperElement(element: Element, style: string): boolean;

  /**
   * Set up event listeners for copy interception.
   *
   * Providers may need different event attachment strategies:
   * - Notion: Simple keydown on document
   * - Google Docs: Also attach to iframes
   *
   * @param handler - Keyboard event handler
   */
  setupEventListeners(handler: (e: KeyboardEvent) => Promise<void>): void;

  /**
   * Clean up event listeners.
   * Called when content script is unloaded.
   */
  cleanup(): void;
}
