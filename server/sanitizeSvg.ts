import DOMPurify from "isomorphic-dompurify";

/** Hard cap on SVG markup size (bytes). Oversized diagrams are dropped. */
export const MAX_SVG_BYTES = 64 * 1024;

/**
 * Sanitize untrusted AI-generated SVG before it is ever stored or sent to the
 * browser. This is defense-in-depth: the client re-sanitizes at the actual
 * innerHTML sink, but cleaning here means we never persist hostile markup.
 *
 * Strips scripts, event handlers, foreignObject, external references, and
 * anything outside the SVG profile. Returns "" for empty/oversized/garbage
 * input so callers can simply treat the diagram as absent.
 */
export function sanitizeSvg(dirty: string | null | undefined): string {
  if (!dirty || typeof dirty !== "string") return "";
  const trimmed = dirty.trim();
  if (!trimmed) return "";
  if (Buffer.byteLength(trimmed, "utf8") > MAX_SVG_BYTES) return "";

  const clean = DOMPurify.sanitize(trimmed, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_TAGS: ["script", "foreignObject", "image", "use", "a"],
    FORBID_ATTR: ["href", "xlink:href"],
  });

  const result = clean.trim();
  // Must still be an <svg> root after cleaning, else treat as no diagram.
  if (!/^<svg[\s>]/i.test(result)) return "";
  return result;
}
