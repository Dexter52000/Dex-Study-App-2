import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { MathResultSchema, type MathResult } from "./schema";
import { SYSTEM_PROMPT } from "./prompt";
import { sanitizeSvg } from "./sanitizeSvg";

const MODEL = process.env.CLAUDE_MODEL ?? "claude-sonnet-4-6";
const REQUEST_TIMEOUT_MS = 60_000;

export const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;
export type ImageMediaType = (typeof SUPPORTED_IMAGE_TYPES)[number];

export interface ExplainInput {
  problem: string;
  image?: { mediaType: ImageMediaType; data: string } | null;
}

/** Error codes surfaced to the client (mapped to friendly Chinese messages). */
export type ErrorCode =
  | "bad_request"
  | "rate_limit"
  | "upstream"
  | "timeout"
  | "server";

export class ExplainError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly httpStatus: number,
    readonly userMessage: string,
  ) {
    super(userMessage);
    this.name = "ExplainError";
  }
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new ExplainError(
      "server",
      500,
      "服务器还没有配置 AI 密钥,请联系管理员。",
    );
  }
  if (!client) client = new Anthropic({ timeout: REQUEST_TIMEOUT_MS });
  return client;
}

/** Map an Anthropic SDK exception to our client-facing error envelope. */
export function mapAnthropicError(err: unknown): ExplainError {
  if (err instanceof ExplainError) return err;
  if (err instanceof Anthropic.RateLimitError) {
    return new ExplainError("rate_limit", 429, "现在使用的人太多啦,请过一会儿再试。");
  }
  if (err instanceof Anthropic.BadRequestError) {
    return new ExplainError("bad_request", 400, "这道题我没看明白,换个说法或换张清楚点的图再试试。");
  }
  if (err instanceof Anthropic.APIConnectionTimeoutError) {
    return new ExplainError("timeout", 504, "想得有点久,网络好像超时了,请再试一次。");
  }
  if (err instanceof Anthropic.APIError) {
    return new ExplainError("upstream", 502, "AI 老师暂时有点忙,请稍后再试一次。");
  }
  return new ExplainError("server", 500, "出了点小问题,请再试一次。");
}

/**
 * Call Claude to produce a guided, kid-friendly explanation (+ SVG diagram,
 * real-life example, flashcards) for a math problem. Uses structured output so
 * the JSON is schema-valid by construction, prompt caching on the big system
 * prompt, and optional base64 vision input for photographed problems.
 */
export async function explain(input: ExplainInput): Promise<MathResult> {
  const problem = input.problem?.trim() ?? "";
  if (!problem && !input.image) {
    throw new ExplainError("bad_request", 400, "请先输入题目,或者拍一张题目照片。");
  }

  const userContent: Anthropic.ContentBlockParam[] = [];
  if (input.image) {
    userContent.push({
      type: "image",
      source: {
        type: "base64",
        media_type: input.image.mediaType,
        data: input.image.data,
      },
    });
  }
  userContent.push({
    type: "text",
    text: problem
      ? `请帮我理解并讲解这道数学题:\n\n${problem}`
      : "请读取图片里的数学题,帮我理解并讲解它。",
  });

  let response;
  try {
    response = await getClient().messages.parse({
      model: MODEL,
      max_tokens: 6000,
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      ],
      messages: [{ role: "user", content: userContent }],
      output_config: { format: zodOutputFormat(MathResultSchema), effort: "medium" },
    });
  } catch (err) {
    throw mapAnthropicError(err);
  }

  const parsed = response.parsed_output;
  if (!parsed) {
    // Refusal or truncation — no schema-valid output.
    throw new ExplainError("upstream", 502, "这道题我一下子没讲清楚,换个问法再试一次吧。");
  }

  // Sanitize the AI SVG before it leaves the server (defense-in-depth).
  return { ...parsed, diagramSvg: sanitizeSvg(parsed.diagramSvg) };
}
