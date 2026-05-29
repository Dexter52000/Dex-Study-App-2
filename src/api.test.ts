import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, explainProblem } from "./api";

afterEach(() => {
  vi.restoreAllMocks();
});

function mockFetch(impl: () => Response | Promise<Response>) {
  vi.stubGlobal("fetch", vi.fn(impl));
}

const result = {
  title: "t",
  concept: "c",
  steps: [],
  answer: "a",
  diagramSvg: "",
  realLifeExample: "r",
  flashcards: [],
};

describe("explainProblem", () => {
  it("returns the parsed result on success", async () => {
    mockFetch(() => new Response(JSON.stringify(result), { status: 200 }));
    await expect(explainProblem("1+1", null)).resolves.toEqual(result);
  });

  it("throws ApiError with the server's code and Chinese message", async () => {
    mockFetch(
      () =>
        new Response(
          JSON.stringify({ error: { code: "rate_limit", message: "太忙了" } }),
          { status: 429 },
        ),
    );
    await expect(explainProblem("x", null)).rejects.toMatchObject({
      name: "ApiError",
      code: "rate_limit",
      message: "太忙了",
    });
  });

  it("falls back to a default message when the error body is unparseable", async () => {
    mockFetch(() => new Response("boom", { status: 500 }));
    const err = await explainProblem("x", null).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toBeTruthy();
  });

  it("maps a network failure to a friendly error", async () => {
    mockFetch(() => {
      throw new Error("offline");
    });
    await expect(explainProblem("x", null)).rejects.toMatchObject({
      code: "network",
    });
  });
});
