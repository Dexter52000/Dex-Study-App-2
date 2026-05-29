/** Client for the explain backend. The API key lives only on the server. */

export interface Step {
  hint: string;
  explanation: string;
}

export interface Flashcard {
  front: string;
  back: string;
}

export interface MathResult {
  title: string;
  concept: string;
  steps: Step[];
  answer: string;
  diagramSvg: string;
  realLifeExample: string;
  flashcards: Flashcard[];
}

export interface ImagePayload {
  mediaType: string;
  data: string; // base64, no data: prefix
}

/** Thrown for any non-2xx response; carries the friendly Chinese message. */
export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function explainProblem(
  problem: string,
  image: ImagePayload | null,
): Promise<MathResult> {
  let res: Response;
  try {
    res = await fetch("/api/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ problem, image }),
    });
  } catch {
    throw new ApiError("network", "连不上服务器,请检查网络后再试。");
  }

  if (!res.ok) {
    let code = "server";
    let message = "出了点小问题,请再试一次。";
    try {
      const body = await res.json();
      if (body?.error?.message) {
        code = body.error.code ?? code;
        message = body.error.message;
      }
    } catch {
      /* keep defaults */
    }
    throw new ApiError(code, message);
  }

  return (await res.json()) as MathResult;
}
