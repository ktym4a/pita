import type { PublicPath } from "wxt/browser";

/**
 * Icon size configuration for Chrome extension.
 */
export const ICON_SIZES = [16, 32, 48, 96, 128] as const;
export type IconSize = (typeof ICON_SIZES)[number];

/**
 * Icon paths for normal state (with leading slash for browser API).
 */
export const ICON_PATHS: Record<IconSize, PublicPath> = {
  16: "/icon/16.png",
  32: "/icon/32.png",
  48: "/icon/48.png",
  96: "/icon/96.png",
  128: "/icon/128.png",
};

/**
 * Icon paths for setIcon API (without leading slash).
 */
export const ICON_PATHS_FOR_API: Record<IconSize, string> = {
  16: "icon/16.png",
  32: "icon/32.png",
  48: "icon/48.png",
  96: "icon/96.png",
  128: "icon/128.png",
};

/**
 * Cache for generated grayscale icon data.
 */
const grayscaleCache = new Map<IconSize, ImageData>();

/**
 * Load an image from a path and return it as an ImageBitmap.
 *
 * @param {PublicPath} path - Path to the image
 * @returns {Promise<ImageBitmap>} Loaded image bitmap
 */
async function loadImage(path: PublicPath): Promise<ImageBitmap> {
  const url = browser.runtime.getURL(path);
  const response = await fetch(url);
  const blob = await response.blob();
  return createImageBitmap(blob);
}

/**
 * Convert an image to grayscale using OffscreenCanvas.
 *
 * @param {ImageBitmap} bitmap - Source image bitmap
 * @returns {ImageData} Grayscale image data
 */
function toGrayscale(bitmap: ImageBitmap): ImageData {
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get 2d context");
  }

  ctx.drawImage(bitmap, 0, 0);
  const imageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
  const data = imageData.data;

  // Convert to grayscale using luminance formula
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // ITU-R BT.709 luminance formula
    const gray = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
    // Alpha channel (data[i + 3]) remains unchanged
  }

  return imageData;
}

/**
 * Get grayscale ImageData for an icon size.
 * Results are cached for performance.
 *
 * @param {IconSize} size - Icon size
 * @returns {Promise<ImageData>} Grayscale image data
 */
export async function getGrayscaleIcon(size: IconSize): Promise<ImageData> {
  const cached = grayscaleCache.get(size);
  if (cached) {
    return cached;
  }

  const bitmap = await loadImage(ICON_PATHS[size]);
  const grayscale = toGrayscale(bitmap);
  grayscaleCache.set(size, grayscale);
  bitmap.close();

  return grayscale;
}

/**
 * Get all grayscale icons as a record for setIcon API.
 *
 * @returns {Promise<Record<IconSize, ImageData>>} All grayscale icon data
 */
export async function getAllGrayscaleIcons(): Promise<Record<IconSize, ImageData>> {
  const entries = await Promise.all(
    ICON_SIZES.map(async (size) => [size, await getGrayscaleIcon(size)] as const),
  );
  return Object.fromEntries(entries) as Record<IconSize, ImageData>;
}

/**
 * Clear the grayscale icon cache.
 */
export function clearIconCache(): void {
  grayscaleCache.clear();
}
