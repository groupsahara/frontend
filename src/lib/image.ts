"use client";

/**
 * Client-side image downscale + compression.
 *
 * The live API sits behind nginx with a ~1 MB request-body cap, so a raw photo
 * or screenshot upload fails with a 413 that the browser surfaces as "Unable to
 * reach the server". We resize + re-encode in the browser first so every upload
 * stays comfortably under the limit. Transparency is preserved by encoding to
 * WebP (falls back to the original file if the browser can't encode).
 */

interface CompressOptions {
  /** Longest edge of the output image, in pixels. */
  maxWidth: number;
  /** Target maximum output size in bytes (default ~800 KB). */
  maxBytes?: number;
  /** Output mime type (default image/webp — keeps alpha, compresses well). */
  mimeType?: string;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read the image."));
    img.src = src;
  });
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality));
}

export async function compressImage(file: File, opts: CompressOptions): Promise<File> {
  if (typeof document === "undefined") return file;
  // Non-images (shouldn't happen via accept="image/*") pass through untouched.
  if (!file.type.startsWith("image/")) return file;

  const maxBytes = opts.maxBytes ?? 800_000;
  const type = opts.mimeType ?? "image/webp";

  let img: HTMLImageElement;
  try {
    img = await loadImage(await readAsDataURL(file));
  } catch {
    return file; // unreadable — let the server validate it
  }

  let width = img.naturalWidth || opts.maxWidth;
  let height = img.naturalHeight || opts.maxWidth;
  const scale = Math.min(1, opts.maxWidth / width);
  width = Math.max(1, Math.round(width * scale));
  height = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  const draw = (w: number, h: number) => {
    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
  };

  draw(width, height);

  // Step 1: drop quality until under budget.
  let quality = 0.9;
  let blob = await toBlob(canvas, type, quality);
  while (blob && blob.size > maxBytes && quality > 0.4) {
    quality -= 0.1;
    blob = await toBlob(canvas, type, quality);
  }

  // Step 2: still too big → shrink dimensions and retry.
  while (blob && blob.size > maxBytes && width > 400) {
    width = Math.round(width * 0.85);
    height = Math.round(height * 0.85);
    draw(width, height);
    blob = await toBlob(canvas, type, 0.8);
  }

  if (!blob) return file;
  // If compression somehow produced a larger file than the original, keep original.
  if (blob.size >= file.size && file.size <= maxBytes) return file;

  const ext = type === "image/webp" ? "webp" : type === "image/png" ? "png" : "jpg";
  const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${baseName}.${ext}`, { type });
}
