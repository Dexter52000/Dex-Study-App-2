import { useRef, useState } from "react";
import { ApiError, explainProblem, hasGeometry, type MathResult } from "../api";
import { fileToDownscaledPayload } from "../imageUtils";
import type { DiagramSpec, ImagePayload } from "../api";
import SvgDiagram from "./SvgDiagram";
import DynamicGeometry from "./DynamicGeometry";

export interface SaveExtras {
  diagramSpec?: DiagramSpec;
  diagramSvg?: string;
  realLifeExample?: string;
  realLifeImageUrl?: string;
  explanation?: string[];
  concept?: string;
}

interface Props {
  /** Persist one flashcard (with optional AI extras) into the AI deck. */
  onSaveCard: (front: string, back: string, extras: SaveExtras) => void;
  /** Active child id (child mode) — enforces per-child daily limits. */
  childId?: string | null;
}

const EXAMPLES = [
  "求底边 5cm、高 4cm 的三角形的面积",
  "一个直角三角形,两条直角边是 3 和 4,斜边是多少?",
  "把 1/2 和 1/3 相加,结果是多少?",
  "一个长方形长 8cm、宽 3cm,周长和面积各是多少?",
];

export default function ExplainView({ onSaveCard, childId }: Props) {
  const [problem, setProblem] = useState("");
  const [image, setImage] = useState<ImagePayload | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MathResult | null>(null);

  // Guided reveal state.
  const [visibleSteps, setVisibleSteps] = useState(1);
  const [shownExplanations, setShownExplanations] = useState<Set<number>>(new Set());
  const [answerShown, setAnswerShown] = useState(false);
  const [savedCards, setSavedCards] = useState<Set<number>>(new Set());

  const fileInput = useRef<HTMLInputElement>(null);

  function resetReveal() {
    setVisibleSteps(1);
    setShownExplanations(new Set());
    setAnswerShown(false);
    setSavedCards(new Set());
  }

  async function handleImage(file: File) {
    try {
      const payload = await fileToDownscaledPayload(file);
      setImage(payload);
      setImagePreview(`data:${payload.mediaType};base64,${payload.data}`);
    } catch {
      setError("这张图片处理不了,换一张试试。");
    }
  }

  async function submit() {
    if (!problem.trim() && !image) {
      setError("请先输入题目,或者拍一张题目照片。");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await explainProblem(problem, image, childId);
      setResult(res);
      resetReveal();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "出了点小问题,请再试一次。");
    } finally {
      setLoading(false);
    }
  }

  function revealAll() {
    if (!result) return;
    setVisibleSteps(result.steps.length);
    setShownExplanations(new Set(result.steps.map((_, i) => i)));
    setAnswerShown(true);
  }

  return (
    <section>
      <div className="explain-input">
        <textarea
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
          placeholder="把数学题打在这里(几何、面积、分数、算术都可以)……"
          rows={3}
        />

        {imagePreview && (
          <div className="image-chip">
            <img src={imagePreview} alt="题目照片" />
            <button
              className="btn-ghost btn-danger"
              onClick={() => {
                setImage(null);
                setImagePreview(null);
                if (fileInput.current) fileInput.current.value = "";
              }}
            >
              移除照片
            </button>
          </div>
        )}

        <div className="row">
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImage(f);
            }}
          />
          <button className="btn-ghost" onClick={() => fileInput.current?.click()}>
            📷 拍照 / 传图
          </button>
          <div className="spacer" />
          <button className="btn-primary" onClick={submit} disabled={loading}>
            {loading ? "AI 老师正在看题……" : "讲给我听"}
          </button>
        </div>

        {!result && !loading && (
          <div className="examples">
            <span className="muted">试试这些:</span>
            {EXAMPLES.map((ex) => (
              <button key={ex} className="example-chip" onClick={() => setProblem(ex)}>
                {ex}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <div className="error-box">{error}</div>}

      {result && (
        <div className="result">
          <div className="row">
            <h2 style={{ margin: 0 }}>{result.title}</h2>
            <div className="spacer" />
            {result.concept && <span className="concept-tag">{result.concept}</span>}
          </div>

          {hasGeometry(result.diagramSpec) ? (
            <div className="diagram-wrap">
              <DynamicGeometry spec={result.diagramSpec} />
            </div>
          ) : (
            result.diagramSvg && (
              <div className="diagram-wrap">
                <SvgDiagram svg={result.diagramSvg} />
              </div>
            )
          )}

          <div className="section-title">一步一步来</div>
          <ol className="steps">
            {result.steps.slice(0, visibleSteps).map((step, i) => {
              const open = shownExplanations.has(i);
              return (
                <li key={i} className="step">
                  <div className="step-hint">💡 {step.hint}</div>
                  {open ? (
                    <div className="step-explain">{step.explanation}</div>
                  ) : (
                    <button
                      className="btn-ghost"
                      onClick={() =>
                        setShownExplanations((s) => new Set(s).add(i))
                      }
                    >
                      想不出来?看这一步怎么做
                    </button>
                  )}
                </li>
              );
            })}
          </ol>

          <div className="row">
            {visibleSteps < result.steps.length && (
              <button
                className="btn-primary"
                onClick={() => setVisibleSteps((n) => n + 1)}
              >
                下一步
              </button>
            )}
            {visibleSteps >= result.steps.length && !answerShown && (
              <button className="btn-primary" onClick={() => setAnswerShown(true)}>
                看最终答案
              </button>
            )}
            <div className="spacer" />
            {!answerShown && (
              <button className="btn-ghost" onClick={revealAll}>
                直接看完整解答
              </button>
            )}
          </div>

          {answerShown && (
            <div className="answer-box">
              <div className="section-title" style={{ marginTop: 0 }}>答案</div>
              {result.answer}
            </div>
          )}

          {result.realLifeExample && (
            <>
              <div className="section-title">生活里的例子 🌍</div>
              {result.realLifeImageUrl && (
                <img
                  className="reallife-image"
                  src={result.realLifeImageUrl}
                  alt="生活场景配图"
                  loading="lazy"
                />
              )}
              <div className="reallife-box">{result.realLifeExample}</div>
            </>
          )}

          {result.flashcards.length > 0 && (
            <>
              <div className="section-title">存成闪卡,以后复习</div>
              <div className="flashcard-suggestions">
                {result.flashcards.map((fc, i) => {
                  const saved = savedCards.has(i);
                  return (
                    <div key={i} className="fc-suggestion">
                      <div>
                        <div className="fc-front">{fc.front}</div>
                        <div className="fc-back">{fc.back}</div>
                      </div>
                      <button
                        className={saved ? "btn-ghost" : "btn-primary"}
                        disabled={saved}
                        onClick={() => {
                          onSaveCard(fc.front, fc.back, {
                            diagramSpec: hasGeometry(result.diagramSpec)
                              ? result.diagramSpec
                              : undefined,
                            diagramSvg: result.diagramSvg || undefined,
                            realLifeExample: result.realLifeExample || undefined,
                            realLifeImageUrl: result.realLifeImageUrl || undefined,
                            explanation: result.steps.map((s) => s.explanation),
                            concept: result.concept || undefined,
                          });
                          setSavedCards((s) => new Set(s).add(i));
                        }}
                      >
                        {saved ? "已保存 ✓" : "保存"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}
