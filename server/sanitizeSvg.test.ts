import { describe, expect, it } from "vitest";
import { sanitizeSvg, MAX_SVG_BYTES } from "./sanitizeSvg";

describe("sanitizeSvg", () => {
  it("keeps a benign labelled geometry diagram", () => {
    const svg =
      "<svg viewBox=\"0 0 100 100\"><polygon points=\"0,100 50,0 100,100\" stroke=\"black\" fill=\"none\"/><text x=\"50\" y=\"10\">A</text></svg>";
    const out = sanitizeSvg(svg);
    expect(out).toContain("<svg");
    expect(out).toContain("polygon");
    expect(out).toContain("<text");
  });

  it("strips <script> tags", () => {
    const out = sanitizeSvg("<svg><script>alert(1)</script></svg>");
    expect(out.toLowerCase()).not.toContain("<script");
  });

  it("strips on* event handlers", () => {
    const out = sanitizeSvg('<svg onload="alert(1)"><rect onclick="x()"/></svg>');
    expect(out).not.toMatch(/onload/i);
    expect(out).not.toMatch(/onclick/i);
  });

  it("removes foreignObject", () => {
    const out = sanitizeSvg(
      "<svg><foreignObject><body>x</body></foreignObject></svg>",
    );
    expect(out.toLowerCase()).not.toContain("foreignobject");
  });

  it("removes external and javascript: references", () => {
    const out = sanitizeSvg(
      '<svg><image href="http://evil.com/x.png"/><a href="javascript:alert(1)"><rect/></a></svg>',
    );
    expect(out).not.toMatch(/evil\.com/);
    expect(out).not.toMatch(/javascript:/i);
  });

  it("returns empty for non-svg, empty, or null input", () => {
    expect(sanitizeSvg("")).toBe("");
    expect(sanitizeSvg(null)).toBe("");
    expect(sanitizeSvg(undefined)).toBe("");
    expect(sanitizeSvg("<div>not svg</div>")).toBe("");
  });

  it("rejects oversized input", () => {
    const huge = "<svg>" + "a".repeat(MAX_SVG_BYTES + 1) + "</svg>";
    expect(sanitizeSvg(huge)).toBe("");
  });
});
