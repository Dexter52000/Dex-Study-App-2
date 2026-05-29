import type { ImagePayload } from "./api";

const MAX_EDGE = 1568; // Claude downsizes beyond this anyway; saves tokens/cost.

/**
 * Read an image File, downscale it so the long edge is ≤ MAX_EDGE, and return
 * base64 (no data: prefix) ready for the explain API. Re-encodes to JPEG to
 * keep the payload small.
 */
export async function fileToDownscaledPayload(file: File): Promise<ImagePayload> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法处理图片");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  const data = dataUrl.split(",")[1] ?? "";
  return { mediaType: "image/jpeg", data };
}
