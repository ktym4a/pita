import type { PitaSettings } from "@/lib/storage/settings";

/**
 * i18n API interface for dependency injection.
 */
export interface I18nApi {
  getMessage: (
    key: string,
    substitutions?: string | string[],
    options?: { escapeLt?: boolean },
  ) => string;
}

/**
 * Apply i18n text to elements with data-i18n attribute.
 *
 * @param {Document} doc - Document object
 * @param {I18nApi} i18n - i18n API
 */
export function applyI18n(doc: Document, i18n: I18nApi): void {
  const elements = doc.querySelectorAll<HTMLElement>("[data-i18n]");
  for (const el of elements) {
    const key = el.dataset.i18n;
    if (key) {
      const message = i18n.getMessage(key);
      if (message) {
        el.textContent = message;
      }
    }
  }
}

/**
 * Update UI based on settings.
 *
 * @param {Document} doc - Document object
 * @param {PitaSettings} settings - Current settings
 * @param {string[]} providerIds - List of provider IDs
 */
export function updateUI(doc: Document, settings: PitaSettings, providerIds: string[]): void {
  const globalEnabled = settings.globalEnabled;

  const globalToggle = doc.getElementById("global-toggle");
  if (globalToggle) {
    globalToggle.setAttribute("aria-checked", String(globalEnabled));
    globalToggle.classList.toggle("enabled", globalEnabled);
  }

  // Update markdown mode toggle
  const markdownToggle = doc.getElementById("markdown-toggle");
  if (markdownToggle) {
    const isMarkdown = settings.outputMode === "markdown";
    markdownToggle.setAttribute("aria-checked", String(isMarkdown));
    markdownToggle.classList.toggle("enabled", isMarkdown);
    markdownToggle.classList.toggle("disabled", !globalEnabled);
    (markdownToggle as HTMLButtonElement).disabled = !globalEnabled;

    const modeCard = markdownToggle.closest(".mode-toggle-card");
    if (modeCard) {
      modeCard.classList.toggle("disabled", !globalEnabled);
    }
  }

  for (const providerId of providerIds) {
    const row = doc.getElementById(`provider-${providerId}`);
    const toggle = doc.querySelector(`[data-provider="${providerId}"]`);

    if (row && toggle) {
      const providerEnabled = settings.providers[providerId]?.enabled ?? true;

      toggle.setAttribute("aria-checked", String(providerEnabled));
      toggle.classList.toggle("enabled", providerEnabled);
      toggle.classList.toggle("disabled", !globalEnabled);
      (toggle as HTMLButtonElement).disabled = !globalEnabled;

      row.classList.toggle("disabled", !globalEnabled);
    }
  }
}

/**
 * Set up toggle click handlers.
 *
 * @param {Document} doc - Document object
 * @param {string[]} providerIds - List of provider IDs
 * @param {Function} onGlobalToggle - Callback for global toggle click
 * @param {Function} onProviderToggle - Callback for provider toggle click
 * @param {Function} onMarkdownToggle - Callback for markdown toggle click
 */
export function setupToggleHandlers(
  doc: Document,
  providerIds: string[],
  onGlobalToggle: () => void,
  onProviderToggle: (providerId: string) => void,
  onMarkdownToggle: () => void,
): void {
  const globalToggle = doc.getElementById("global-toggle");
  globalToggle?.addEventListener("click", onGlobalToggle);

  const markdownToggle = doc.getElementById("markdown-toggle");
  markdownToggle?.addEventListener("click", onMarkdownToggle);

  for (const providerId of providerIds) {
    const toggle = doc.querySelector(`[data-provider="${providerId}"]`);
    toggle?.addEventListener("click", () => {
      onProviderToggle(providerId);
    });
  }
}
