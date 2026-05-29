import { describe, expect, it } from "vitest";
import {
  angleDeg,
  distance,
  formatArea,
  formatLength,
  polygonArea,
  round1,
} from "./geometry";

describe("distance", () => {
  it("computes a 3-4-5 distance", () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
});

describe("polygonArea", () => {
  it("area of a unit square is 1", () => {
    expect(
      polygonArea([
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
        { x: 0, y: 1 },
      ]),
    ).toBe(1);
  });

  it("area of a 3×4 right triangle is 6", () => {
    expect(
      polygonArea([
        { x: 0, y: 0 },
        { x: 3, y: 0 },
        { x: 0, y: 4 },
      ]),
    ).toBe(6);
  });

  it("is orientation-independent (clockwise still positive)", () => {
    const cw = polygonArea([
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 0 },
    ]);
    expect(cw).toBe(1);
  });

  it("degenerate (<3 points) is 0", () => {
    expect(polygonArea([{ x: 0, y: 0 }])).toBe(0);
  });
});

describe("angleDeg", () => {
  it("perpendicular rays are 90°", () => {
    expect(angleDeg({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(90);
  });

  it("straight line is 180°", () => {
    expect(angleDeg({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: -1, y: 0 })).toBeCloseTo(180);
  });

  it("degenerate ray is 0", () => {
    expect(angleDeg({ x: 0, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 })).toBe(0);
  });
});

describe("formatters", () => {
  it("scales length by unitScale and appends unit", () => {
    expect(formatLength(100, 0.05, "cm")).toBe("5cm");
  });
  it("scales area by unitScale² and appends unit²", () => {
    expect(formatArea(8000, 0.05, "cm")).toBe("20 cm²");
  });
  it("hides measures when unitScale is 0", () => {
    expect(formatLength(100, 0, "cm")).toBe("");
    expect(formatArea(100, 0, "cm")).toBe("");
  });
  it("round1 rounds to one decimal", () => {
    expect(round1(3.14159)).toBe(3.1);
  });
});
