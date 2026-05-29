import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

/**
 * Real-life illustration generation for the explain flow.
 *
 * Design notes:
 * - Style is locked to friendly flat ILLUSTRATION and explicitly excludes real
 *   people / photorealistic children (OpenAI blocks photoreal minors by
 *   default, and it's the right call for a kids' product anyway).
 * - Images are cached on disk by a hash of (model + prompt), so the same
 *   concept reuses one generation — cost approaches zero with repeats.
 * - Everything degrades gracefully: no key, disabled, or any error → null, and
 *   the UI simply shows the text example instead.
 */

const IMAGE_MODEL = process.env.IMAGE_MODEL ?? "gpt-image-1";
const IMAGE_QUALITY = process.env.IMAGE_QUALITY ?? "medium";
const IMAGE_SIZE = process.env.IMAGE_SIZE ?? "1024x1024";
const CACHE_DIR = join(process.cwd(), ".image-cache");
const HASH_RE = /^[a-f0-9]{64}$/;

export function imageEnabled(): boolean {
  return Boolean(process.env.OPENAI_API_KEY) && process.env.IMAGE_PROVIDER !== "none";
}

/** Wrap a scene description with a child-safe, illustration-style prompt. */
export function buildImagePrompt(scene: string): string {
  return [
    "A friendly, colorful flat vector illustration for a children's math app.",
    "Clean, simple, bright, educational, no text or numbers in the image.",
    "Do NOT include any real people or photorealistic children.",
    `Scene: ${scene.trim()}`,
  ].join(" ");
}

export function conceptHash(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/** Read a cached image by hash for serving. Validates the hash (no traversal). */
export function readImage(hash: string): { buf: Buffer; contentType: string } | null {
  if (!HASH_RE.test(hash)) return null;
  const file = join(CACHE_DIR, `${hash}.png`);
  if (!existsSync(file)) return null;
  return { buf: readFileSync(file), contentType: "image/png" };
}

/**
 * Ensure a real-life illustration exists for `scene`, generating it via the
 * image API if not cached. Returns a same-origin URL (`/api/image/<hash>`) or
 * null on any failure / when disabled.
 */
export async function ensureRealLifeImage(scene: string): Promise<string | null> {
  if (!imageEnabled() || !scene.trim()) return null;

  const prompt = buildImagePrompt(scene);
  const hash = conceptHash(`${IMAGE_MODEL}|${IMAGE_SIZE}|${prompt}`);
  const file = join(CACHE_DIR, `${hash}.png`);

  if (existsSync(file)) return `/api/image/${hash}`;

  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        prompt,
        size: IMAGE_SIZE,
        quality: IMAGE_QUALITY,
        n: 1,
      }),
      signal: AbortSignal.timeout(60_000),
    });
    if (!res.ok) return null;

    const json = (await res.json()) as { data?: { b64_json?: string }[] };
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) return null;

    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(file, Buffer.from(b64, "base64"));
    return `/api/image/${hash}`;
  } catch {
    return null;
  }
}
