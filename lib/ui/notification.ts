import type { ContentScriptContext } from "wxt/utils/content-script-context";

/**
 * Notification configuration - internal to this module
 */
const NOTIFICATION_CONFIG = {
  name: "pita-notification",
  duration: 2000,
  animationDuration: 300,
} as const;

type ShadowRootUi = Awaited<ReturnType<typeof createShadowRootUi>>;

let notificationUi: ShadowRootUi | null = null;
let notificationElement: HTMLDivElement | null = null;
let hideTimeoutId: ReturnType<typeof setTimeout> | null = null;

/**
 * Initialize the notification UI with Shadow Root.
 * Must be called before showNotification.
 *
 * @param {ContentScriptContext} ctx - WXT content script context
 */
export async function initNotification(ctx: ContentScriptContext): Promise<void> {
  notificationUi = await createShadowRootUi(ctx, {
    name: NOTIFICATION_CONFIG.name,
    position: "inline",
    anchor: "body",
    onMount(container) {
      const notification = document.createElement("div");
      notification.className = "notification";
      notification.style.display = "none";
      container.append(notification);
      notificationElement = notification;
    },
    onRemove() {
      notificationElement = null;
      if (hideTimeoutId) {
        clearTimeout(hideTimeoutId);
        hideTimeoutId = null;
      }
    },
  });
  notificationUi.mount();
}

/**
 * Show a temporary notification toast.
 * initNotification must be called before this function.
 *
 * @param {string} message - Message to display
 */
export function showNotification(message: string): void {
  if (!notificationElement) return;

  // Clear any pending hide timeout
  if (hideTimeoutId) {
    clearTimeout(hideTimeoutId);
    hideTimeoutId = null;
  }

  // Reset animation and show
  notificationElement.classList.remove("slide-out");
  notificationElement.style.display = "block";
  notificationElement.textContent = message;

  // Force reflow to restart animation
  void notificationElement.offsetWidth;
  notificationElement.style.animation = `pita-slide-in ${NOTIFICATION_CONFIG.animationDuration}ms ease-out`;

  // Auto-hide after duration
  hideTimeoutId = setTimeout(() => {
    if (!notificationElement) return;
    notificationElement.classList.add("slide-out");
    setTimeout(() => {
      if (notificationElement) {
        notificationElement.style.display = "none";
      }
    }, NOTIFICATION_CONFIG.animationDuration);
  }, NOTIFICATION_CONFIG.duration);
}

/**
 * Cleanup the notification UI.
 * Should be called when the content script is invalidated.
 */
export function cleanupNotification(): void {
  if (hideTimeoutId) {
    clearTimeout(hideTimeoutId);
    hideTimeoutId = null;
  }
  notificationUi?.remove();
  notificationUi = null;
  notificationElement = null;
}
