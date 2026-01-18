import type { PublicPath } from "wxt/browser";

/**
 * Icon size configuration for Chrome extension.
 */
export const ICON_SIZES = [16, 32, 48, 96, 128] as const;
export type IconSize = (typeof ICON_SIZES)[number];

/**
 * Icon paths for browser extension APIs.
 */
export const ICON_PATHS: Record<IconSize, string> = {
  16: "icon/16.png",
  32: "icon/32.png",
  48: "icon/48.png",
  96: "icon/96.png",
  128: "icon/128.png",
};

/**
 * Cache for generated disabled icon data.
 */
const disabledIconCache = new Map<IconSize, ImageData>();

/**
 * Brightness boost factor for disabled state icons.
 * 0 = no change, 1 = fully white.
 */
const BRIGHTNESS_BOOST = 0.3;

/**
 * Slash line color for disabled state.
 */
const SLASH_COLOR = "#a6adc8";

/**
 * Load an image from a path and return it as an ImageBitmap.
 *
 * @param {string} path - Path to the image (without leading slash)
 * @returns {Promise<ImageBitmap>} Loaded image bitmap
 */
async function loadImage(path: string): Promise<ImageBitmap> {
  const url = browser.runtime.getURL(`/${path}` as PublicPath);
  const response = await fetch(url);
  const blob = await response.blob();
  return createImageBitmap(blob);
}

/**
 * Convert an image to disabled state (grayscale with brightness boost and slash).
 *
 * @param {ImageBitmap} bitmap - Source image bitmap
 * @returns {ImageData} Disabled state image data
 */
function toDisabledIcon(bitmap: ImageBitmap): ImageData {
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get 2d context");
  }

  ctx.drawImage(bitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
  const data = imageData.data;

  // Convert to grayscale using luminance formula and boost brightness
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // ITU-R BT.709 luminance formula
    const gray = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
    // Boost brightness by blending toward white
    const brightGray = Math.round(gray + (255 - gray) * BRIGHTNESS_BOOST);
    data[i] = brightGray;
    data[i + 1] = brightGray;
    data[i + 2] = brightGray;
    // Alpha channel (data[i + 3]) remains unchanged
  }

  // Put grayscale image back to canvas
  ctx.putImageData(imageData, 0, 0);

  // Draw diagonal slash line (top-right to bottom-left)
  const size = bitmap.width;
  const padding = Math.round(size * 0.2);
  const lineWidth = Math.max(2, Math.round(size * 0.08));

  ctx.strokeStyle = SLASH_COLOR;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(size - padding, padding);
  ctx.lineTo(padding, size - padding);
  ctx.stroke();

  return ctx.getImageData(0, 0, bitmap.width, bitmap.height);
}

/**
 * Get disabled state ImageData for an icon size.
 * Results are cached for performance.
 *
 * @param {IconSize} size - Icon size
 * @returns {Promise<ImageData>} Disabled state image data
 */
export async function getDisabledIcon(size: IconSize): Promise<ImageData> {
  const cached = disabledIconCache.get(size);
  if (cached) {
    return cached;
  }

  const bitmap = await loadImage(ICON_PATHS[size]);
  const disabled = toDisabledIcon(bitmap);
  disabledIconCache.set(size, disabled);
  bitmap.close();

  return disabled;
}

/**
 * Get all disabled icons as a record for setIcon API.
 *
 * @returns {Promise<Record<IconSize, ImageData>>} All disabled icon data
 */
export async function getAllDisabledIcons(): Promise<Record<IconSize, ImageData>> {
  const entries = await Promise.all(
    ICON_SIZES.map(async (size) => [size, await getDisabledIcon(size)] as const),
  );
  return Object.fromEntries(entries) as Record<IconSize, ImageData>;
}
