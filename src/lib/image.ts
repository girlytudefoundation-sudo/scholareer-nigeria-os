export const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

export const PHOTO_PLACEHOLDER_HINT = "JPG, PNG or WEBP · up to 8MB";

/**
 * Reads an image file, downscales it to passport proportions and returns a
 * base64 data URL. Data URLs are plain strings, so Dexie/IndexedDB persists
 * them across refreshes, browser restarts and offline sessions — unlike
 * temporary object URLs.
 */
export async function fileToPassportDataUrl(
  file: File,
  maxWidth = 420,
  maxHeight = 540,
  quality = 0.82,
): Promise<string> {
  if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
    throw new Error("Only JPG, PNG or WEBP images are supported.");
  }
  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Image is too large. Please use a file under 8MB.");
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("That file is not a readable image."));
    el.src = dataUrl;
  });

  const ratio = Math.min(maxWidth / img.width, maxHeight / img.height, 1);
  const width = Math.max(1, Math.round(img.width * ratio));
  const height = Math.max(1, Math.round(img.height * ratio));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

export function initialsOf(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || "?";
}
