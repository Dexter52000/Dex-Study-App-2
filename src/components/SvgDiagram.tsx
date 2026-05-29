import { useMemo } from "react";
import DOMPurify from "dompurify";

interface Props {
  svg: string | undefined;
  className?: string;
}

/**
 * Renders AI-generated SVG. The markup is untrusted even though the server
 * already sanitized it — this is the actual innerHTML sink, so we re-sanitize
 * client-side with DOMPurify (belt and suspenders). Renders nothing if the SVG
 * is empty or doesn't survive sanitization.
 */
export default function SvgDiagram({ svg, className }: Props) {
  const clean = useMemo(() => {
    if (!svg) return "";
    const out = DOMPurify.sanitize(svg, {
      USE_PROFILES: { svg: true, svgFilters: true },
      FORBID_TAGS: ["script", "foreignObject", "image", "use", "a"],
      FORBID_ATTR: ["href", "xlink:href"],
    });
    return /^<svg[\s>]/i.test(out.trim()) ? out : "";
  }, [svg]);

  if (!clean) return null;
  return (
    <div
      className={`svg-diagram ${className ?? ""}`}
      // eslint-disable-next-line react/no-danger -- sanitized above + on the server
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
