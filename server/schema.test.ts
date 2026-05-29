import { describe, expect, it } from "vitest";
import { MathResultSchema } from "./schema";

const valid = {
  title: "三角形面积",
  concept: "三角形面积",
  steps: [{ hint: "底和高是多少?", explanation: "底=5,高=4" }],
  answer: "面积 = 10 平方厘米",
  diagramSvg: "<svg viewBox='0 0 10 10'></svg>",
  realLifeExample: "像一块三角形的披萨",
  flashcards: [{ front: "三角形面积公式", back: "底×高÷2" }],
};

describe("MathResultSchema", () => {
  it("accepts a well-formed result", () => {
    expect(MathResultSchema.parse(valid)).toEqual(valid);
  });

  it("rejects when answer is missing", () => {
    const { answer: _answer, ...rest } = valid;
    expect(MathResultSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects wrong types", () => {
    expect(
      MathResultSchema.safeParse({ ...valid, steps: "nope" }).success,
    ).toBe(false);
  });

  it("allows an empty diagram and empty card list", () => {
    const res = MathResultSchema.safeParse({
      ...valid,
      diagramSvg: "",
      flashcards: [],
    });
    expect(res.success).toBe(true);
  });
});
