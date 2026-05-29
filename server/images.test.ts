import { afterEach, describe, expect, it } from "vitest";
import {
  buildImagePrompt,
  conceptHash,
  ensureRealLifeImage,
  imageEnabled,
  readImage,
} from "./images";

const savedKey = process.env.OPENAI_API_KEY;
afterEach(() => {
  if (savedKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = savedKey;
  delete process.env.IMAGE_PROVIDER;
});

describe("conceptHash", () => {
  it("is deterministic and a 64-char hex string", () => {
    const a = conceptHash("梯子靠墙");
    const b = conceptHash("梯子靠墙");
    expect(a).toBe(b);
    expect(a).toMatch(/^[a-f0-9]{64}$/);
  });
  it("differs for different input", () => {
    expect(conceptHash("a")).not.toBe(conceptHash("b"));
  });
});

describe("buildImagePrompt", () => {
  it("locks an illustration style and excludes real/photoreal children", () => {
    const p = buildImagePrompt("a wooden ladder leaning on a wall");
    expect(p).toMatch(/illustration/i);
    expect(p).toMatch(/do not include any real people/i);
    expect(p).toContain("a wooden ladder leaning on a wall");
  });
});

describe("readImage", () => {
  it("rejects non-hash paths (no traversal)", () => {
    expect(readImage("../secret")).toBeNull();
    expect(readImage("not-a-hash")).toBeNull();
    expect(readImage("a".repeat(64))).toBeNull(); // valid shape but not on disk
  });
});

describe("imageEnabled / ensureRealLifeImage", () => {
  it("is disabled and returns null when no key is set", async () => {
    delete process.env.OPENAI_API_KEY;
    expect(imageEnabled()).toBe(false);
    expect(await ensureRealLifeImage("梯子靠墙")).toBeNull();
  });

  it("is disabled when IMAGE_PROVIDER=none even with a key", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.IMAGE_PROVIDER = "none";
    expect(imageEnabled()).toBe(false);
    expect(await ensureRealLifeImage("梯子靠墙")).toBeNull();
  });
});
