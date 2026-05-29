import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  explain,
  ExplainError,
  mapAnthropicError,
  SUPPORTED_IMAGE_TYPES,
  type ImageMediaType,
} from "./claude";
import { ensureRealLifeImage, imageEnabled, readImage } from "./images";
import { accountRouter } from "./accounts";
import { currentParent } from "./auth";
import { addUsage, getChild, usageFor } from "./db";
import { isOverDailyLimit } from "./usage";

const PORT = Number(process.env.PORT) || 8787;
const isProd = process.env.NODE_ENV === "production";

const app = express();
app.use(cookieParser());
// Base64 images inflate the body; allow headroom but cap it (oversized →
// Express returns 413, which we surface as a friendly message below).
app.use(express.json({ limit: "12mb" }));

app.use("/api", accountRouter);

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    hasKey: Boolean(process.env.ANTHROPIC_API_KEY),
    imagesEnabled: imageEnabled(),
  });
});

// Serve cached real-life illustrations.
app.get("/api/image/:hash", (req, res) => {
  const img = readImage(req.params.hash);
  if (!img) {
    res.status(404).end();
    return;
  }
  res.type(img.contentType);
  res.setHeader("Cache-Control", "public, max-age=604800, immutable");
  res.send(img.buf);
});

app.post("/api/explain", async (req, res) => {
  try {
    const body = req.body ?? {};
    const problem = typeof body.problem === "string" ? body.problem : "";

    let image: { mediaType: ImageMediaType; data: string } | null = null;
    if (body.image != null) {
      const { mediaType, data } = body.image;
      if (
        typeof mediaType !== "string" ||
        typeof data !== "string" ||
        !SUPPORTED_IMAGE_TYPES.includes(mediaType as ImageMediaType)
      ) {
        throw new ExplainError("bad_request", 400, "图片格式不支持,请用 JPG / PNG / WebP。");
      }
      image = { mediaType: mediaType as ImageMediaType, data };
    }

    // 孩子模式:若带了 child id,必须是已登录家长名下的档案,并执行每日上限。
    const childId = req.header("x-child-id");
    let child = null;
    if (childId) {
      const parent = currentParent(req);
      child = getChild(childId);
      if (!parent || !child || child.parentId !== parent.id) {
        throw new ExplainError("bad_request", 403, "请用家长账号登录后再使用孩子模式。");
      }
      if (isOverDailyLimit(child, usageFor(child.id))) {
        throw new ExplainError(
          "bad_request",
          429,
          "今天的使用次数到上限啦,明天再来,或让家长调整设置。",
        );
      }
    }

    const result = await explain({ problem, image });
    if (child) addUsage({ childId: child.id, kind: "explain", estCostCents: 5 });

    // Generate a real-life illustration (best-effort; null if disabled/fails).
    const realLifeImageUrl = await ensureRealLifeImage(result.realLifePrompt);

    res.json({ ...result, realLifeImageUrl });
  } catch (err) {
    const e = err instanceof ExplainError ? err : mapAnthropicError(err);
    res.status(e.httpStatus).json({ error: { code: e.code, message: e.userMessage } });
  }
});

// Body too large (e.g. an enormous image) → friendly Chinese error.
app.use(
  (
    err: Error & { type?: string },
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    if (err?.type === "entity.too.large") {
      res
        .status(413)
        .json({ error: { code: "bad_request", message: "图片太大了,请换一张小一点的。" } });
      return;
    }
    next(err);
  },
);

if (isProd) {
  // Serve the built SPA and fall back to index.html for client-side routes.
  const dist = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
  app.use(express.static(dist));
  app.get("*", (_req, res) => res.sendFile(join(dist, "index.html")));
}

app.listen(PORT, () => {
  console.log(`[VisuMath] API listening on http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn("[VisuMath] ⚠ ANTHROPIC_API_KEY not set — /api/explain will return an error.");
  }
});
